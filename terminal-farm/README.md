# Terminal Farm - MT5 Terminal Docker Setup

This directory contains the Docker setup for running MT5 terminals in containers for automated trade synchronization.

## Files

- `Dockerfile` - MT5 + WINE container image
- `supervisor.conf` - Process management configuration
- `scripts/start-terminal.sh` - Container startup script
- `ea/TradeTaperSync.mq5` - MQL5 Expert Advisor for trade syncing

## Building the Image

```bash
# Build the Docker image
docker build -t mt5-terminal:latest .

# Note: You need mt5-install.zip in the same directory as Dockerfile
# This file contains the pre-installed MT5 and must be provided separately
```

## Running a Container

```bash
docker run -d \
  --name mt5-terminal-test \
  -e MT5_SERVER="ICMarkets-Demo" \
  -e MT5_LOGIN="12345678" \
  -e MT5_PASSWORD="your_password" \
  -e TERMINAL_ID="test-terminal-001" \
  -e API_ENDPOINT="https://your-app.vercel.app" \
  -e API_KEY="your-webhook-secret" \
  mt5-terminal:latest
```

## Environment Variables

- `MT5_SERVER` - MT5 broker server name (required)
- `MT5_LOGIN` - MT5 account login (required)
- `MT5_PASSWORD` - MT5 account password (required)
- `TERMINAL_ID` - Unique terminal identifier (UUID, required)
- `API_ENDPOINT` - Trading Journal API URL (required)
  - **Format:** Full URL without trailing slash (e.g., `https://your-app.vercel.app`)
  - **Do NOT include:** Trailing slash (e.g., `https://your-app.vercel.app/`)
- `API_KEY` - Webhook secret for API authentication (required)
  - This should match `TERMINAL_WEBHOOK_SECRET` environment variable in your backend

## Notes

- MT5 installation files (`mt5-install.zip`) must be provided separately
- The EA will compile automatically on first run if `.ex5` file doesn't exist
- Container requires at least 1GB RAM
- VNC is available on port 5900 for debugging (optional)
