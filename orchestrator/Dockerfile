FROM python:3.11-slim

WORKDIR /app

# Install Docker SDK dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy orchestrator code
COPY config.py docker_client.py reconciliation.py main.py ./

# Run orchestrator
CMD ["python", "main.py"]
