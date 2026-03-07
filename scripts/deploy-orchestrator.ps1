# Deploy orchestrator to Cloud Run (GCP). Use this on Windows (PowerShell). Same as deploy-orchestrator.sh.

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectId = (gcloud config get-value project 2>$null),
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-central1",
    [Parameter(Mandatory=$true)]
    [string]$TradingJournalUrl,
    [Parameter(Mandatory=$true)]
    [string]$OrchestratorSecret,
    [Parameter(Mandatory=$true)]
    [string]$VmDockerHost,
    [Parameter(Mandatory=$true)]
    [string]$TerminalWebhookSecret
)

if (-not $ProjectId) {
    Write-Error "ProjectId required. Pass -ProjectId or set: gcloud config set project YOUR_PROJECT_ID"
    exit 1
}

Write-Host "=== Deploying Orchestrator to Cloud Run ==="
Write-Host "Project: $ProjectId"
Write-Host "Region: $Region"

Push-Location orchestrator
try {
    gcloud builds submit --tag "gcr.io/$ProjectId/orchestrator:latest"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    gcloud run jobs create orchestrator `
        --image="gcr.io/$ProjectId/orchestrator:latest" `
        --region=$Region `
        --set-env-vars="TRADING_JOURNAL_URL=$TradingJournalUrl" `
        --set-env-vars="ORCHESTRATOR_SECRET=$OrchestratorSecret" `
        --set-env-vars="VM_DOCKER_HOST=$VmDockerHost" `
        --set-env-vars="TERMINAL_WEBHOOK_SECRET=$TerminalWebhookSecret" `
        --set-env-vars="TERMINAL_IMAGE=gcr.io/$ProjectId/mt5-terminal:latest" `
        --set-env-vars="GCP_PROJECT_ID=$ProjectId" `
        --set-env-vars="GCP_REGION=$Region" `
        --set-env-vars="VM_DOCKER_TLS_VERIFY=false" `
        --memory=512Mi `
        --cpu=1 `
        --max-retries=3 `
        --timeout=300s

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Job may already exist. Update with: gcloud run jobs update orchestrator --region=$Region (and set-env-vars as needed)"
        exit $LASTEXITCODE
    }

    Write-Host "Orchestrator job created. To run every minute, add a Cloud Scheduler job (see deploy-orchestrator.sh for the gcloud scheduler command)."
} finally {
    Pop-Location
}
