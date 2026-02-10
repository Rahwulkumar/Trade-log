#!/bin/bash
# Terminal Farm - MT5 Terminal Startup Script
# This script initializes and starts the MT5 terminal

# set -e removed to prevent crash on non-fatal wine errors

echo "=== Trading Journal Terminal Farm - Starting MT5 Terminal ==="

# Validate required environment variables
if [ -z "$MT5_SERVER" ] || [ -z "$MT5_LOGIN" ] || [ -z "$MT5_PASSWORD" ]; then
    echo "Error: MT5_SERVER, MT5_LOGIN, and MT5_PASSWORD are required"
    exit 1
fi

if [ -z "$TERMINAL_ID" ]; then
    echo "Error: TERMINAL_ID is required"
    exit 1
fi

if [ -z "$API_ENDPOINT" ]; then
    echo "Error: API_ENDPOINT is required"
    exit 1
fi

echo "Terminal ID: $TERMINAL_ID"
echo "MT5 Server: $MT5_SERVER"
echo "MT5 Login: $MT5_LOGIN"
echo "API Endpoint: $API_ENDPOINT"

# Display is handled by supervisor
export DISPLAY=:99

# Wait for display to be ready
sleep 2

# Create MT5 configuration file
MT5_CONFIG_DIR="/home/trader/.wine/drive_c/Program Files/MetaTrader 5/config"
mkdir -p "$MT5_CONFIG_DIR"

# Use TERMINAL_WEBHOOK_SECRET as API_KEY if provided, otherwise use API_KEY env var
if [ -z "$API_KEY" ]; then
    if [ -n "$TERMINAL_WEBHOOK_SECRET" ]; then
        API_KEY="$TERMINAL_WEBHOOK_SECRET"
    else
        API_KEY="none"
    fi
fi

echo "DEBUG: Using API_KEY: ${API_KEY:0:4}..." # Only show first 4 chars for security

cat > "$MT5_CONFIG_DIR/terminal.ini" << EOF
[Common]
Login=$MT5_LOGIN
Password=$MT5_PASSWORD
Server=$MT5_SERVER
ProxyEnable=0
AutoConfiguration=1
NewsEnable=0
ExpertsEnable=1
ExpertsProfile=0
ExpertsDllImport=0
ExpertsAllowLiveTrading=1
ExpertsTrades=1
AllowWebRequest=1
WebRequestUrl=$API_ENDPOINT

[StartUp]
Expert=TradeTaperSync
ExpertParameters=$API_ENDPOINT|$API_KEY|$TERMINAL_ID
Symbol=EURUSD
Period=1
EOF

echo "Configuration written to $MT5_CONFIG_DIR/terminal.ini"

# Copy EA to MT5 folder if not already there
EA_SOURCE="/home/trader/mt5/MQL5/Experts/TradeTaperSync.mq5"
EA_DEST="/home/trader/.wine/drive_c/Program Files/MetaTrader 5/MQL5/Experts/TradeTaperSync.mq5"

if [ -f "$EA_SOURCE" ]; then
    mkdir -p "$(dirname "$EA_DEST")"
    cp "$EA_SOURCE" "$EA_DEST"
    echo "EA copied to MT5 folder"
    
    # Copy compiled .ex5 if it exists in source
    EX5_SOURCE="/home/trader/mt5/MQL5/Experts/TradeTaperSync.ex5"
    EX5_DEST="/home/trader/.wine/drive_c/Program Files/MetaTrader 5/MQL5/Experts/TradeTaperSync.ex5"
    
    if [ -f "$EX5_SOURCE" ]; then
        cp "$EX5_SOURCE" "$EX5_DEST"
        echo "Found and copied TradeTaperSync.ex5 to MT5 folder"
    fi
    
    # Check if .ex5 already exists (pre-compiled or uploaded)
    if [ -f "$EX5_DEST" ]; then
        echo "Found existing TradeTaperSync.ex5, skipping compilation."
    else
        # Compile EA only if .ex5 is missing
        echo "Compiling EA..."
        cd "/home/trader/.wine/drive_c/Program Files/MetaTrader 5"
        
        # Create Logs directory explicitly
        mkdir -p "MQL5/Logs"
        
        # Use xvfb-run -a to avoid conflicts with existing display and ensure proper auth
        # Use explicit absolute paths (windows style with forward slashes)
        xvfb-run -a wine metaeditor64.exe /portable /compile:"MQL5/Experts/TradeTaperSync.mq5" /log:"MQL5/Logs/compile.log"
        
        if [ -f "MQL5/Experts/TradeTaperSync.ex5" ]; then
            echo "Compilation successful"
        else
            echo "Compilation FAILED. Log content:"
            cat "MQL5/Logs/compile.log" || echo "No log file generated"
            
            # Fallback: Check if we have a pre-compiled version (if user uploads it later)
            # For now, we exit if compilation fails because EA is critical
            echo "Critical: EA compilation failed. Exiting."
            exit 1
        fi
    fi
fi

# Start MT5 terminal
echo "Starting MetaTrader 5..."
MT5_EXE="/home/trader/.wine/drive_c/Program Files/MetaTrader 5/terminal64.exe"

if [ -f "$MT5_EXE" ]; then
    cd "/home/trader/.wine/drive_c/Program Files/MetaTrader 5"
    wine terminal64.exe /portable /config:config/terminal.ini &
    
    echo "MT5 terminal started"
    
    # Keep container running
    wait
else
    echo "Error: MT5 terminal executable not found at $MT5_EXE"
    echo "Listing Program Files:"
    ls -F "/home/trader/.wine/drive_c/Program Files/"
    exit 1
fi
