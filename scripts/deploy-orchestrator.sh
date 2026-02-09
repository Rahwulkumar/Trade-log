#!/bin/bash
# Deploy orchestrator to Cloud Run

set -e

PROJECT_ID=${1:-$(gcloud config get-value project)}
REGION=${2:-us-central1}
TRADING_JOURNAL_URL=${3:-""}
ORCHESTRATOR_SECRET=${4:-""}
VM_DOCKER_HOST=${5:-""}
TERMINAL_WEBHOOK_SECRET=${6:-""}

if [ -z "$TRADING_JOURNAL_URL" ] || [ -z "$ORCHESTRATOR_SECRET" ] || [ -z "$VM_DOCKER_HOST" ] || [ -z "$TERMINAL_WEBHOOK_SECRET" ]; then
    echo "Usage: $0 PROJECT_ID REGION TRADING_JOURNAL_URL ORCHESTRATOR_SECRET VM_DOCKER_HOST TERMINAL_WEBHOOK_SECRET"
    exit 1
fi

echo "=== Deploying Orchestrator to Cloud Run ==="
echo "Project: $PROJECT_ID"
echo "Region: $REGION"

# Build image
cd orchestrator
gcloud builds submit --tag gcr.io/$PROJECT_ID/orchestrator:latest

# Deploy as Cloud Run Job
gcloud run jobs create orchestrator \
  --image=gcr.io/$PROJECT_ID/orchestrator:latest \
  --region=$REGION \
  --set-env-vars="TRADING_JOURNAL_URL=$TRADING_JOURNAL_URL" \
  --set-env-vars="ORCHESTRATOR_SECRET=$ORCHESTRATOR_SECRET" \
  --set-env-vars="VM_DOCKER_HOST=$VM_DOCKER_HOST" \
  --set-env-vars="TERMINAL_WEBHOOK_SECRET=$TERMINAL_WEBHOOK_SECRET" \
  --set-env-vars="TERMINAL_IMAGE=gcr.io/$PROJECT_ID/mt5-terminal:latest" \
  --set-env-vars="GCP_PROJECT_ID=$PROJECT_ID" \
  --set-env-vars="GCP_REGION=$REGION" \
  --set-env-vars="VM_DOCKER_TLS_VERIFY=false" \
  --memory=512Mi \
  --cpu=1 \
  --max-retries=3 \
  --timeout=300s

# Create Cloud Scheduler job (runs every minute)
gcloud scheduler jobs create http orchestrator-schedule \
  --location=$REGION \
  --schedule="*/1 * * * *" \
  --uri="https://$REGION-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/$PROJECT_ID/jobs/orchestrator:run" \
  --http-method=POST \
  --oauth-service-account-email=$(gcloud iam service-accounts list --filter="displayName:Compute Engine default service account" --format="value(email)")

echo "Orchestrator deployed successfully!"
echo "Scheduler will trigger it every minute"
