#!/bin/bash
# Setup script for GCP VM
# Creates VM and configures Docker for remote access

set -e

PROJECT_ID=${1:-$(gcloud config get-value project)}
VM_NAME=${2:-terminal-farm-vm}
ZONE=${3:-us-central1-a}
MACHINE_TYPE=${4:-e2-micro}

echo "=== Setting up Terminal Farm VM ==="
echo "Project: $PROJECT_ID"
echo "VM Name: $VM_NAME"
echo "Zone: $ZONE"
echo "Machine Type: $MACHINE_TYPE"

# Create VM
echo "Creating VM..."
gcloud compute instances create $VM_NAME \
  --project=$PROJECT_ID \
  --zone=$ZONE \
  --machine-type=$MACHINE_TYPE \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB \
  --metadata=startup-script='#!/bin/bash
# Enable Swap (2GB for 1GB RAM VM)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo "/swapfile none swap sw 0 0" >> /etc/fstab

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker $USER

# Configure Docker for remote access (insecure for now, add TLS later)
mkdir -p /etc/systemd/system/docker.service.d
cat > /etc/systemd/system/docker.service.d/override.conf << EOF
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd -H tcp://0.0.0.0:2375 -H unix:///var/run/docker.sock
EOF

systemctl daemon-reload
systemctl restart docker
'

echo "Waiting for VM to be ready (60 seconds)..."
sleep 60

echo "VM created successfully!"
echo ""
echo "Next steps:"
echo "1. Configure firewall: gcloud compute firewall-rules create allow-docker --allow tcp:2375 --source-ranges 0.0.0.0/0"
echo "2. Get VM IP: gcloud compute instances describe $VM_NAME --zone=$ZONE --format='get(networkInterfaces[0].accessConfigs[0].natIP)'"
echo "3. Update orchestrator config with VM IP"
