# GCP Quick Start - Simplified Setup

## TL;DR: Get Orchestrator Running in 30 Minutes

This is a simplified guide to get the orchestrator running on GCP Cloud Run using the free tier.

## Prerequisites

1. GCP account with billing enabled
2. `gcloud` CLI installed
3. Basic terminal knowledge

## Step 1: One-Time GCP Setup (5 minutes)

```bash
# Login and create project
gcloud auth login
gcloud projects create trading-journal-orchestrator
gcloud config set project trading-journal-orchestrator

# Enable APIs
gcloud services enable run.googleapis.com cloudscheduler.googleapis.com cloudbuild.googleapis.com
```

## Step 2: Create Simple Orchestrator (10 minutes)

Create `orchestrator/main.py`:

```python
import os
import requests
from google.cloud import run_v2
from google.api_core import exceptions

TRADING_JOURNAL_URL = os.getenv('TRADING_JOURNAL_URL')
ORCHESTRATOR_SECRET = os.getenv('ORCHESTRATOR_SECRET')
PROJECT_ID = os.getenv('GCP_PROJECT_ID')
REGION = 'us-central1'

run_client = run_v2.ServicesClient()

def get_configs():
    r = requests.get(
        f'{TRADING_JOURNAL_URL}/api/orchestrator/config',
        headers={'x-orchestrator-secret': ORCHESTRATOR_SECRET},
        timeout=10
    )
    return r.json() if r.ok else []

def reconcile():
    configs = get_configs()
    print(f"Found {len(configs)} terminals to manage")
    
    # For each terminal, create/update Cloud Run service
    for config in configs:
        terminal_id = config['id']
        service_name = f'mt5-terminal-{terminal_id}'
        
        # Check if exists
        parent = f"projects/{PROJECT_ID}/locations/{REGION}"
        try:
            existing = run_client.get_service(
                name=f"{parent}/services/{service_name}"
            )
            print(f"Service {service_name} exists, skipping")
            continue
        except exceptions.NotFound:
            pass
        
        # Create service
        service = run_v2.Service(
            metadata=run_v2.ObjectMeta(name=service_name),
            spec=run_v2.ServiceSpec(
                template=run_v2.RevisionTemplate(
                    containers=[run_v2.Container(
                        image='gcr.io/PROJECT_ID/mt5-terminal:latest',
                        env=[
                            run_v2.EnvVar(name='MT5_SERVER', value=config['server']),
                            run_v2.EnvVar(name='MT5_LOGIN', value=config['login']),
                            run_v2.EnvVar(name='MT5_PASSWORD', value=config['password']),
                            run_v2.EnvVar(name='TERMINAL_ID', value=terminal_id),
                            run_v2.EnvVar(name='API_ENDPOINT', value=TRADING_JOURNAL_URL),
                        ],
                    )],
                    min_scale=0,  # Scale to zero (free tier)
                    max_scale=1,
                )
            )
        )
        
        run_client.create_service(
            parent=parent,
            service=service,
            service_id=service_name
        )
        print(f"Created {service_name}")

if __name__ == '__main__':
    reconcile()
```

Create `orchestrator/requirements.txt`:
```
requests==2.31.0
google-cloud-run==0.10.0
```

Create `orchestrator/Dockerfile`:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY main.py .
CMD ["python", "main.py"]
```

## Step 3: Deploy (5 minutes)

```bash
cd orchestrator

# Build and push
gcloud builds submit --tag gcr.io/$(gcloud config get-value project)/orchestrator

# Deploy as Cloud Run Job
gcloud run jobs create orchestrator \
    --image=gcr.io/$(gcloud config get-value project)/orchestrator \
    --region=us-central1 \
    --set-env-vars="TRADING_JOURNAL_URL=https://your-app.vercel.app" \
    --set-env-vars="ORCHESTRATOR_SECRET=your-secret" \
    --set-env-vars="GCP_PROJECT_ID=$(gcloud config get-value project)" \
    --memory=512Mi \
    --max-retries=3
```

## Step 4: Schedule (2 minutes)

```bash
# Run every minute
gcloud scheduler jobs create http orchestrator-schedule \
    --location=us-central1 \
    --schedule="*/1 * * * *" \
    --uri="https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/$(gcloud config get-value project)/jobs/orchestrator:run" \
    --http-method=POST \
    --oauth-service-account-email=$(gcloud iam service-accounts list --filter="displayName:Compute Engine default service account" --format="value(email)")
```

## Step 5: Set Permissions (3 minutes)

```bash
PROJECT_ID=$(gcloud config get-value project)
SA_EMAIL=$(gcloud iam service-accounts list --filter="displayName:Compute Engine default service account" --format="value(email)")

# Grant Cloud Run admin
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/run.admin"
```

## Step 6: Build MT5 Terminal Image (5 minutes)

You'll need to build the MT5 terminal container separately. Use the Dockerfile from `F:\tradetaper\terminal-farm\Dockerfile`:

```bash
# Build MT5 terminal image
cd /path/to/tradetaper/terminal-farm
gcloud builds submit --tag gcr.io/$(gcloud config get-value project)/mt5-terminal
```

## That's It!

The orchestrator will now:
1. Run every minute (Cloud Scheduler)
2. Poll your Trading Journal API
3. Create/update Cloud Run services for each terminal
4. Services scale to zero when not in use (free tier)

## Cost Analysis

### Free Tier Limits
- **Cloud Run**: 2M requests/month, 360K GB-seconds, 180K vCPU-seconds
- **Cloud Scheduler**: 3 jobs free, unlimited executions
- **Cloud Build**: 120 build-minutes/day

### Cost Calculation

**Orchestrator Job (✅ FREE TIER):**
- Runs: 1,440 times/day (every 60s) = 43,200/month
- Each run: ~5 seconds, 512MB = 0.5 GB-seconds, 0.5 vCPU-seconds
- **Monthly**: 21,600 GB-seconds, 21,600 vCPU-seconds
- **Status**: ✅ Well within free tier limits

**MT5 Terminal Services (⚠️ EXCEEDS FREE TIER with 10 terminals):**
- Heartbeats: Every 30 seconds per terminal
- 10 terminals × 2 requests/min × 60 min × 24 hours × 30 days = **864,000 requests/month**
- Each request: ~2 seconds, 2GB = 4 GB-seconds, 1 vCPU-second
- **Monthly**: 3,456,000 GB-seconds (❌ OVER 360K limit), 864,000 vCPU-seconds (❌ OVER 180K limit)

### How to Stay in Free Tier

**Option 1: Reduce Heartbeat Frequency (Recommended)**
- Change EA to send heartbeat every **2-5 minutes** instead of 30 seconds
- 10 terminals × 0.5 requests/min = 216,000 requests/month
- **Monthly**: 864,000 GB-seconds (still over, but closer)
- **Better**: 5 terminals = 432,000 GB-seconds (still over)
- **Best**: 3 terminals = 259,200 GB-seconds ✅ (within limit)

**Option 2: Use Compute Engine Free Tier (Better for Multiple Terminals)**
- 1x e2-micro VM (always free)
- Run all terminals in Docker on one VM
- **Cost**: $0/month (always free tier)
- **Trade-off**: Less scalable, but truly free

**Option 3: Hybrid Approach**
- Use Cloud Run for 1-3 terminals (free tier)
- Use Compute Engine for additional terminals (free tier)
- **Total Cost**: $0/month

### Recommendation

For **1-3 terminals**: ✅ **YES, you'll stay in free tier** with Cloud Run
For **4-10 terminals**: ❌ **NO, you'll exceed free tier** - use Compute Engine instead

## Next Steps

1. Test with one terminal first
2. Monitor costs in GCP Console
3. Adjust polling frequency if needed
4. Scale up as you add more accounts

## Troubleshooting

```bash
# View orchestrator logs
gcloud logging read "resource.type=cloud_run_job" --limit 50

# Manually trigger orchestrator
gcloud run jobs execute orchestrator --region=us-central1

# List Cloud Run services
gcloud run services list --region=us-central1
```
