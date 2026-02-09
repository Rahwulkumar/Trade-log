# Terminal Farm Orchestrator

Python service that manages MT5 terminal containers on a VM by polling the Trading Journal API.

## How It Works

1. Polls `/api/orchestrator/config` every 60 seconds
2. Gets list of terminals that should be running
3. Compares with actual Docker containers on VM
4. Creates/stops containers to match desired state

## Local Testing

```bash
# Set environment variables
export TRADING_JOURNAL_URL="https://your-app.vercel.app"
export ORCHESTRATOR_SECRET="your-secret"
export VM_DOCKER_HOST="tcp://localhost:2375"  # For local Docker
export TERMINAL_WEBHOOK_SECRET="webhook-secret"
export TERMINAL_IMAGE="mt5-terminal:latest"

# Install dependencies
pip install -r requirements.txt

# Run orchestrator
python main.py
```

## Docker Build

```bash
docker build -t orchestrator:latest .
```

## Environment Variables

- `TRADING_JOURNAL_URL` - Your Trading Journal API URL (required)
  - **Format:** Full URL without trailing slash (e.g., `https://your-app.vercel.app`)
  - **Do NOT include:** Trailing slash
- `ORCHESTRATOR_SECRET` - Secret for authenticating with API (required)
  - Must match `ORCHESTRATOR_SECRET` in your backend environment variables
- `VM_DOCKER_HOST` - Docker daemon URL (e.g., `tcp://VM_IP:2376`) (required)
  - For local testing: `tcp://localhost:2375` (if Docker exposes port)
  - For GCP VM: `tcp://VM_EXTERNAL_IP:2375` (if firewall allows)
- `VM_DOCKER_CERT_PATH` - Path to Docker TLS certificates (optional, for secure connection)
- `VM_DOCKER_TLS_VERIFY` - Enable TLS verification (default: true)
- `TERMINAL_WEBHOOK_SECRET` - Secret for terminal webhooks (required)
  - Must match `TERMINAL_WEBHOOK_SECRET` in your backend environment variables
  - This is passed to containers as `API_KEY` environment variable
- `TERMINAL_IMAGE` - Docker image name for MT5 terminals (required)
  - Example: `gcr.io/PROJECT_ID/mt5-terminal:latest`
- `GCP_PROJECT_ID` - GCP project ID (for Cloud Run deployment)
- `GCP_REGION` - GCP region (default: us-central1)
