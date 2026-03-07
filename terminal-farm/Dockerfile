# Terminal Farm - MT5 Terminal Docker Image
# This Dockerfile creates a container with MT5 running under WINE
# for automated trade synchronization with Trading Journal

FROM ubuntu:22.04

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    cabextract \
    xvfb \
    x11vnc \
    supervisor \
    unzip \
    libvulkan1 \
    mesa-vulkan-drivers \
    # WINE dependencies
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Add WineHQ repository and install WINE
# MT5 currently trips an anti-debug popup on Wine 11 in this setup.
# Pin to Wine 10 stable until upstream compatibility improves.
ARG WINEHQ_STABLE_VERSION=10.0.0.0~jammy-1
RUN dpkg --add-architecture i386 \
    && mkdir -pm755 /etc/apt/keyrings \
    && wget -O /etc/apt/keyrings/winehq-archive.key https://dl.winehq.org/wine-builds/winehq.key \
    && wget -NP /etc/apt/sources.list.d/ https://dl.winehq.org/wine-builds/ubuntu/dists/jammy/winehq-jammy.sources \
    && apt-get update \
    && apt-get install -y --install-recommends \
        "winehq-stable=${WINEHQ_STABLE_VERSION}" \
        "wine-stable=${WINEHQ_STABLE_VERSION}" \
        "wine-stable-amd64=${WINEHQ_STABLE_VERSION}" \
        "wine-stable-i386:i386=${WINEHQ_STABLE_VERSION}" \
    && rm -rf /var/lib/apt/lists/*

# Install winetricks for additional Windows components
RUN wget https://raw.githubusercontent.com/Winetricks/winetricks/master/src/winetricks \
    && chmod +x winetricks \
    && mv winetricks /usr/local/bin/

# Create user for running MT5
RUN useradd -m -s /bin/bash trader
USER trader
WORKDIR /home/trader

# Initialize WINE prefix
ENV WINEPREFIX=/home/trader/.wine
ENV WINEARCH=win64
RUN wineboot --init

# Install required Windows components
# xvfb-run is required because some installers try to pop up windows even in silent mode
RUN xvfb-run -a winetricks -q corefonts

# Copy and extract pre-installed MT5
COPY --chown=trader:trader mt5-install.zip /tmp/mt5-install.zip
RUN mkdir -p "/home/trader/.wine/drive_c/Program Files/" && \
    unzip /tmp/mt5-install.zip -d "/home/trader/.wine/drive_c/Program Files/" && \
    rm /tmp/mt5-install.zip && \
    echo "MT5 extracted successfully"

# Download MT5 installer (will be replaced with actual installation at runtime)
# Note: MT5 installer must be provided separately due to licensing
RUN mkdir -p /home/trader/mt5

# Create directories for EA and configuration
RUN mkdir -p /home/trader/mt5/MQL5/Experts \
    && mkdir -p /home/trader/config

# Copy Trading Journal Sync EA source + optional precompiled binary.
# If TradeTaperSync.ex5 is present, runtime compilation is skipped.
COPY --chown=trader:trader ea/ /home/trader/mt5/MQL5/Experts/

# Switch back to root for supervisor
USER root

# Create supervisor configuration
RUN mkdir -p /var/log/supervisor
COPY supervisor.conf /etc/supervisor/conf.d/mt5.conf

# Create startup script
COPY scripts/start-terminal.sh /start.sh
COPY scripts/webhook-bridge.sh /webhook-bridge.sh
RUN chmod +x /start.sh /webhook-bridge.sh

# Expose VNC port for debugging (optional)
EXPOSE 5900

# Environment variables for MT5 configuration
ENV MT5_SERVER=""
ENV MT5_LOGIN=""
ENV MT5_PASSWORD=""
ENV TERMINAL_ID=""
ENV API_ENDPOINT=""
ENV API_KEY=""

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/mt5.conf"]
