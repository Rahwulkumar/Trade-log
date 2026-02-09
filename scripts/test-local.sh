#!/bin/bash
# Local testing script for orchestrator

set -e

echo "=== Local Orchestrator Testing ==="

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "ERROR: Docker is not running"
    exit 1
fi

# Set environment variables for local testing
export TRADING_JOURNAL_URL="http://localhost:3000"
export ORCHESTRATOR_SECRET="dev-secret"
export VM_DOCKER_HOST="tcp://localhost:2375"  # Local Docker
export TERMINAL_WEBHOOK_SECRET="dev-webhook-secret"
export TERMINAL_IMAGE="mt5-terminal:latest"
export VM_DOCKER_TLS_VERIFY="false"

# Check if required env vars are set
if [ -z "$TRADING_JOURNAL_URL" ]; then
    echo "ERROR: TRADING_JOURNAL_URL not set"
    exit 1
fi

echo "Configuration:"
echo "  Trading Journal URL: $TRADING_JOURNAL_URL"
echo "  Docker Host: $VM_DOCKER_HOST"
echo "  Terminal Image: $TERMINAL_IMAGE"
echo ""

# Install dependencies if needed
if [ ! -d "orchestrator/venv" ]; then
    echo "Creating virtual environment..."
    cd orchestrator
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
fi

# Run orchestrator
echo "Running orchestrator..."
cd orchestrator
source venv/bin/activate
python main.py
