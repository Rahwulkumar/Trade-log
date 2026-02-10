#!/bin/bash
# Build and push MT5 terminal Docker image to GCP

set -e

PROJECT_ID=${1:-$(gcloud config get-value project)}
IMAGE_NAME=${2:-mt5-terminal}

echo "=== Building MT5 Terminal Image ==="
echo "Project: $PROJECT_ID"
echo "Image: $IMAGE_NAME"

# Check if mt5-install.zip exists
if [ ! -f "terminal-farm/mt5-install.zip" ]; then
    echo "ERROR: mt5-install.zip not found in terminal-farm/"
    echo "Please provide MT5 installation files before building"
    exit 1
fi

# Build image
cd terminal-farm
gcloud builds submit --tag gcr.io/$PROJECT_ID/$IMAGE_NAME:latest

echo "Image built and pushed successfully!"
echo "Image: gcr.io/$PROJECT_ID/$IMAGE_NAME:latest"
