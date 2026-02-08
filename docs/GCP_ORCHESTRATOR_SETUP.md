# GCP Cloud Run Orchestrator Setup Guide

## Overview

Deploy the Terminal Farm orchestrator to **Google Cloud Run** for cost-effective, serverless container management. Cloud Run is perfect for this use case because:

- ✅ **Free Tier**: 2 million requests/month, 360,000 GB-seconds, 180,000 vCPU-seconds
- ✅ **Cold Starts**: Containers start on-demand (perfect for periodic polling)
- ✅ **Pay-per-use**: Only pay when containers are running
- ✅ **Docker Support**: Can run Docker-in-Docker or use Cloud Build
- ✅ **Scheduled Triggers**: Use Cloud Scheduler to poll every 60 seconds

## Architecture

```
┌─────────────────────┐
│  Cloud Scheduler    │
│  (Every 60 seconds) │
└──────────┬──────────┘
           │
           │ Triggers
           ▼
┌─────────────────────┐
│   Cloud Run Job     │
│   (Orchestrator)    │
│   - Polls /api/     │
│     orchestrator/   │
│     config          │
│   - Manages Docker  │
│     containers      │
└──────────┬──────────┘
           │
           │ Creates/Stops
           ▼
┌─────────────────────┐
│  Cloud Run Services │
│  (MT5 Terminals)    │
│  - One per account  │
│  - Runs MT5 + EA    │
└─────────────────────┘
```

## Prerequisites

1. **GCP Account** with billing enabled (free tier still requires billing)
2. **gcloud CLI** installed: https://cloud.google.com/sdk/docs/install
3. **Docker** installed locally (for building images)
4. **Python 3.9+** (for orchestrator script)

## Step 1: Create GCP Project

```bash
# Login to GCP
gcloud auth login

# Create new project (or use existing)
gcloud projects create trading-journal-orchestrator --name="Trading Journal Orchestrator"

# Set as default project
gcloud config set project trading-journal-orchestrator

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

## Step 2: Create Orchestrator Service

### 2.1 Create Orchestrator Directory

```bash
mkdir -p orchestrator
cd orchestrator
```

### 2.2 Create Orchestrator Script

Create `orchestrator/main.py`:

```python
"""
Terminal Farm Orchestrator
Polls Trading Journal API and manages Cloud Run services for MT5 terminals
"""

import os
import requests
import json
import time
from google.cloud import run_v2
from google.api_core import exceptions

# Configuration
TRADING_JOURNAL_URL = os.getenv('TRADING_JOURNAL_URL', 'https://your-app.vercel.app')
ORCHESTRATOR_SECRET = os.getenv('ORCHESTRATOR_SECRET')
PROJECT_ID = os.getenv('GCP_PROJECT_ID')
REGION = os.getenv('GCP_REGION', 'us-central1')

# Cloud Run client
run_client = run_v2.ServicesClient()

def get_terminal_configs():
    """Fetch desired terminal state from Trading Journal"""
    try:
        response = requests.get(
            f'{TRADING_JOURNAL_URL}/api/orchestrator/config',
            headers={'x-orchestrator-secret': ORCHESTRATOR_SECRET},
            timeout=10
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching config: {e}")
        return []

def get_existing_services():
    """List all existing Cloud Run services (MT5 terminals)"""
    parent = f"projects/{PROJECT_ID}/locations/{REGION}"
    services = []
    
    try:
        for service in run_client.list_services(parent=parent):
            # Filter only MT5 terminal services
            if service.name.startswith('mt5-terminal-'):
                services.append(service)
    except Exception as e:
        print(f"Error listing services: {e}")
    
    return services

def create_terminal_service(terminal_config):
    """Create a Cloud Run service for an MT5 terminal"""
    terminal_id = terminal_config['id']  # API returns 'id', not 'terminalId'
    service_name = f'mt5-terminal-{terminal_id}'
    
    # Get environment variables from config
    env_vars = terminal_config.get('environment', {})
    
    # Service configuration
    service = run_v2.Service(
        metadata=run_v2.ObjectMeta(
            name=service_name,
            labels={
                'terminal-id': terminal_id,
                'account-id': terminal_config['accountId'],
            }
        ),
        spec=run_v2.ServiceSpec(
            template=run_v2.RevisionTemplate(
                containers=[
                    run_v2.Container(
                        image='us-central1-docker.pkg.dev/PROJECT_ID/orchestrator-repo/mt5-terminal:latest',
                        env=[
                            run_v2.EnvVar(name='MT5_SERVER', value=terminal_config['server']),
                            run_v2.EnvVar(name='MT5_LOGIN', value=terminal_config['login']),
                            run_v2.EnvVar(name='MT5_PASSWORD', value=terminal_config['password']),
                            run_v2.EnvVar(name='TERMINAL_ID', value=terminal_id),
                            run_v2.EnvVar(name='API_ENDPOINT', value=TRADING_JOURNAL_URL),
                        ],
                        resources=run_v2.ResourceRequirements(
                            limits={'cpu': '1', 'memory': '2Gi'},
                            requests={'cpu': '0.5', 'memory': '1Gi'}
                        )
                    )
                ],
                service_account_name='mt5-terminal-sa@PROJECT_ID.iam.gserviceaccount.com',
                timeout='300s',
                max_scale=1,  # Only one instance per terminal
                min_scale=0,  # Allow scale-to-zero (cold start)
            )
        )
    )
    
    parent = f"projects/{PROJECT_ID}/locations/{REGION}"
    
    try:
        operation = run_client.create_service(
            parent=parent,
            service=service,
            service_id=service_name
        )
        print(f"Created service: {service_name}")
        return operation
    except exceptions.AlreadyExists:
        print(f"Service {service_name} already exists")
        return None
    except Exception as e:
        print(f"Error creating service {service_name}: {e}")
        return None

def delete_terminal_service(service_name):
    """Delete a Cloud Run service"""
    full_name = f"projects/{PROJECT_ID}/locations/{REGION}/services/{service_name}"
    
    try:
        operation = run_client.delete_service(name=full_name)
        print(f"Deleted service: {service_name}")
        return operation
    except exceptions.NotFound:
        print(f"Service {service_name} not found")
        return None
    except Exception as e:
        print(f"Error deleting service {service_name}: {e}")
        return None

def reconcile_services():
    """Reconcile desired state with actual state"""
    print("Starting reconciliation...")
    
    # Get desired state
    desired_terminals = get_terminal_configs()
    desired_terminal_ids = {t['id'] for t in desired_terminals}  # API returns 'id'
    
    # Get existing services
    existing_services = get_existing_services()
    existing_terminal_ids = {
        s.metadata.labels.get('terminal-id') 
        for s in existing_services 
        if s.metadata.labels.get('terminal-id')
    }
    
    # Create missing services
    for terminal_config in desired_terminals:
        terminal_id = terminal_config['id']  # API returns 'id'
        if terminal_id not in existing_terminal_ids:
            if terminal_config.get('status') in ['PENDING', 'STARTING', 'RUNNING']:
                print(f"Creating terminal: {terminal_id}")
                create_terminal_service(terminal_config)
    
    # Delete orphaned services
    for service in existing_services:
        terminal_id = service.metadata.labels.get('terminal-id')
        if terminal_id and terminal_id not in desired_terminal_ids:
            print(f"Deleting orphaned terminal: {terminal_id}")
            delete_terminal_service(service.metadata.name)
    
    print("Reconciliation complete")

if __name__ == '__main__':
    reconcile_services()
```

### 2.3 Create Requirements File

Create `orchestrator/requirements.txt`:

```txt
requests==2.31.0
google-cloud-run==0.10.0
```

### 2.4 Create Dockerfile

Create `orchestrator/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# Run orchestrator
CMD ["python", "main.py"]
```

## Step 3: Build and Deploy Orchestrator

### 3.1 Build Container Image

```bash
# Build image
gcloud builds submit --tag gcr.io/PROJECT_ID/orchestrator

# Or use Artifact Registry (recommended)
gcloud artifacts repositories create orchestrator-repo \
    --repository-format=docker \
    --location=us-central1

gcloud builds submit --tag us-central1-docker.pkg.dev/PROJECT_ID/orchestrator-repo/orchestrator:latest
```

### 3.2 Deploy as Cloud Run Job

```bash
# Deploy as Cloud Run Job (for scheduled execution)
gcloud run jobs create orchestrator \
    --image=us-central1-docker.pkg.dev/PROJECT_ID/orchestrator-repo/orchestrator:latest \
    --region=us-central1 \
    --set-env-vars="TRADING_JOURNAL_URL=https://your-app.vercel.app" \
    --set-env-vars="ORCHESTRATOR_SECRET=your-secret-key" \
    --set-env-vars="GCP_PROJECT_ID=PROJECT_ID" \
    --set-env-vars="GCP_REGION=us-central1" \
    --service-account=orchestrator-sa@PROJECT_ID.iam.gserviceaccount.com \
    --max-retries=3 \
    --memory=512Mi \
    --cpu=1 \
    --timeout=300s
```

## Step 4: Create Service Account

```bash
# Create service account for orchestrator
gcloud iam service-accounts create orchestrator-sa \
    --display-name="Orchestrator Service Account"

# Grant permissions to manage Cloud Run services
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:orchestrator-sa@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:orchestrator-sa@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"
```

## Step 5: Schedule Orchestrator

```bash
# Create Cloud Scheduler job to run every 60 seconds
gcloud scheduler jobs create http orchestrator-schedule \
    --location=us-central1 \
    --schedule="*/1 * * * *" \
    --uri="https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/PROJECT_ID/jobs/orchestrator:run" \
    --http-method=POST \
    --oauth-service-account-email=orchestrator-sa@PROJECT_ID.iam.gserviceaccount.com \
    --oauth-token-scope=https://www.googleapis.com/auth/cloud-platform
```

**Note**: Cloud Scheduler minimum interval is 1 minute. For 60-second polling, you can:
- Use Cloud Functions with Cloud Scheduler (more complex)
- Run orchestrator as a Cloud Run Service (always-on, costs more)
- Accept 1-minute polling interval (recommended for free tier)

## Step 6: Build MT5 Terminal Container

### 6.1 Create MT5 Terminal Dockerfile

Create `mt5-terminal/Dockerfile`:

```dockerfile
FROM ubuntu:22.04

# Install WINE and dependencies
RUN apt-get update && apt-get install -y \
    wine \
    winetricks \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Install MT5 (copy from your setup)
COPY mt5-setup.exe /tmp/
RUN xvfb-run wine /tmp/mt5-setup.exe /S

# Copy EA
COPY TradeTaperSync.mq5 /mt5/MQL5/Experts/

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
```

### 6.2 Create Startup Script

Create `mt5-terminal/start.sh`:

```bash
#!/bin/bash
set -e

# Start MT5 with EA
export DISPLAY=:99
Xvfb :99 -screen 0 1024x768x24 &
wine /mt5/terminal64.exe /portable /config:config.ini

# EA will sync trades via webhook
```

### 6.3 Build and Push Image

```bash
cd mt5-terminal
gcloud builds submit --tag us-central1-docker.pkg.dev/PROJECT_ID/orchestrator-repo/mt5-terminal:latest
```

## Step 7: Update Trading Journal API

Update `/api/orchestrator/config` to return container image:

```typescript
// In getOrchestratorConfig()
return terminals.map(terminal => ({
    terminalId: terminal.id,
    accountId: terminal.account_id,
    status: terminal.status,
    server: mt5Account.server,
    login: mt5Account.login,
    password: decryptedPassword,
    containerImage: 'us-central1-docker.pkg.dev/PROJECT_ID/orchestrator-repo/mt5-terminal:latest', // Add this
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/terminal`,
}));
```

## Step 8: Cost Optimization

### Free Tier Limits
- **Cloud Run**: 2 million requests/month, 360,000 GB-seconds
- **Cloud Scheduler**: 3 free jobs
- **Cloud Build**: 120 build-minutes/day

### Cost Estimates (Beyond Free Tier)

**Scenario: 10 terminals, polling every 60 seconds**

- **Orchestrator Job**: 
  - Runs: 1,440 times/day (every minute)
  - Duration: ~5 seconds each
  - Cost: ~$0.10/month (well within free tier)

- **MT5 Terminal Services**:
  - 10 services, scale-to-zero enabled
  - Only pay when receiving heartbeats (every 30s)
  - Cost: ~$5-10/month for 10 terminals

**Total: ~$5-10/month for 10 terminals** (after free tier)

### Optimization Tips

1. **Scale-to-Zero**: Enable `min_scale=0` (already in config)
2. **Reduce Polling**: Poll every 2-5 minutes instead of 60 seconds
3. **Batch Operations**: Process multiple terminals in one orchestrator run
4. **Regional Deployment**: Deploy in same region to reduce latency

## Step 9: Monitoring

### View Logs

```bash
# Orchestrator logs
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=orchestrator" --limit 50

# Terminal service logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=mt5-terminal-*" --limit 50
```

### Set Up Alerts

```bash
# Create alert for failed orchestrator runs
gcloud alpha monitoring policies create \
    --notification-channels=CHANNEL_ID \
    --display-name="Orchestrator Failed" \
    --condition-display-name="Orchestrator execution failed" \
    --condition-threshold-value=1 \
    --condition-threshold-duration=60s
```

## Troubleshooting

### Orchestrator Not Running
- Check Cloud Scheduler job status
- Verify service account permissions
- Check logs for errors

### Terminals Not Starting
- Verify container image exists
- Check service account permissions
- Verify environment variables

### High Costs
- Enable scale-to-zero
- Reduce polling frequency
- Use preemptible instances (if using Compute Engine)

## Next Steps

1. **Deploy orchestrator** following steps above
2. **Test with one terminal** first
3. **Monitor costs** in GCP Console
4. **Scale up** as needed

## Alternative: Cloud Functions (Simpler but Less Flexible)

If Cloud Run seems complex, you can use **Cloud Functions**:

```python
# main.py for Cloud Functions
def orchestrator(request):
    # Same reconciliation logic
    reconcile_services()
    return {'status': 'success'}
```

Deploy:
```bash
gcloud functions deploy orchestrator \
    --runtime python311 \
    --trigger-http \
    --entry-point orchestrator \
    --set-env-vars="TRADING_JOURNAL_URL=..."
```

Then schedule with Cloud Scheduler (minimum 1 minute interval).

---

**Estimated Setup Time**: 2-3 hours
**Monthly Cost**: $0-10 (depending on usage, mostly free tier)
**Cold Start Latency**: 5-10 seconds (acceptable for 60-second polling)
