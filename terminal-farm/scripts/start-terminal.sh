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

# Create MT5 configuration and preset files.
# Use canonical MT5 folder names (Config / MQL5/Presets) to avoid case-sensitive
# path mismatches on Linux filesystems.
MT5_BASE_DIR="/home/trader/.wine/drive_c/Program Files/MetaTrader 5"
MT5_CONFIG_DIR="$MT5_BASE_DIR/Config"
MT5_CONFIG_MOUNT_DIR="/home/trader/config"
MT5_PRESETS_DIR="$MT5_BASE_DIR/MQL5/Presets"
MT5_FILES_DIR="$MT5_BASE_DIR/MQL5/Files"
MT5_STATE_DIR="/home/trader/state"
MT5_SEED_BUNDLES_DIR="/home/trader/seed-bundles"
mkdir -p "$MT5_CONFIG_DIR"
mkdir -p "$MT5_CONFIG_MOUNT_DIR"
mkdir -p "$MT5_PRESETS_DIR"
mkdir -p "$MT5_FILES_DIR"
mkdir -p "$MT5_STATE_DIR"
mkdir -p "$MT5_SEED_BUNDLES_DIR"

slugify_seed_name() {
    printf '%s' "$1" \
        | tr '[:upper:]' '[:lower:]' \
        | sed 's/[^a-z0-9]/-/g; s/-\{2,\}/-/g; s/^-//; s/-$//'
}

copy_seed_tree() {
    local source_dir="$1"
    local target_dir="$2"
    if [ ! -d "$source_dir" ]; then
        return
    fi

    mkdir -p "$target_dir"
    cp -a "$source_dir"/. "$target_dir"/
}

apply_broker_seed_from_dir() {
    local seed_dir="$1"
    echo "Applying broker seed from $seed_dir"

    copy_seed_tree "$seed_dir/terminal" "$MT5_BASE_DIR"
    copy_seed_tree "$seed_dir/Program Files/MetaTrader 5" "$MT5_BASE_DIR"
    copy_seed_tree "$seed_dir/Config" "$MT5_CONFIG_DIR"
    copy_seed_tree "$seed_dir/config" "$MT5_CONFIG_DIR"
    copy_seed_tree "$seed_dir/bases" "$MT5_BASE_DIR/bases"
    copy_seed_tree "$seed_dir/Profiles" "$MT5_BASE_DIR/Profiles"
    copy_seed_tree "$seed_dir/profiles" "$MT5_BASE_DIR/Profiles"

    if [ -f "$seed_dir/servers.dat" ]; then
        cp "$seed_dir/servers.dat" "$MT5_CONFIG_DIR/servers.dat"
    fi
}

apply_broker_seed() {
    local explicit_seed_name="${MT5_BROKER_SEED_NAME:-}"
    local candidates=()

    if [ -n "$explicit_seed_name" ]; then
        candidates+=("$explicit_seed_name")
        candidates+=("$(slugify_seed_name "$explicit_seed_name")")
    fi

    candidates+=("$MT5_SERVER")
    candidates+=("$(slugify_seed_name "$MT5_SERVER")")
    candidates+=("$(printf '%s' "$MT5_SERVER" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '_')")

    for candidate in "${candidates[@]}"; do
        if [ -z "$candidate" ]; then
            continue
        fi

        if [ -d "$MT5_SEED_BUNDLES_DIR/$candidate" ]; then
            apply_broker_seed_from_dir "$MT5_SEED_BUNDLES_DIR/$candidate"
            return 0
        fi

        if [ -f "$MT5_SEED_BUNDLES_DIR/$candidate.zip" ]; then
            local temp_dir
            temp_dir="$(mktemp -d)"
            unzip -oq "$MT5_SEED_BUNDLES_DIR/$candidate.zip" -d "$temp_dir"
            apply_broker_seed_from_dir "$temp_dir"
            rm -rf "$temp_dir"
            return 0
        fi
    done

    echo "No broker seed bundle found for server $MT5_SERVER"
    return 1
}

# Use TERMINAL_WEBHOOK_SECRET as API_KEY if provided, otherwise use API_KEY env var
if [ -z "$API_KEY" ]; then
    if [ -n "$TERMINAL_WEBHOOK_SECRET" ]; then
        API_KEY="$TERMINAL_WEBHOOK_SECRET"
    else
        API_KEY="none"
    fi
fi

# Normalize key to avoid copy/paste trailing spaces causing webhook auth mismatch.
API_KEY="$(printf '%s' "$API_KEY" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
if [ -z "$API_KEY" ]; then
    API_KEY="none"
fi

echo "DEBUG: Using API_KEY: ${API_KEY:0:4}..." # Only show first 4 chars for security

apply_broker_seed || true

# MT5 startup requires ExpertParameters to reference a .set file located in
# MQL5/Presets, not an inline delimited string.
EA_PRESET_FILE="TradeTaperSync.set"
cat > "$MT5_PRESETS_DIR/$EA_PRESET_FILE" << EOF
APIEndpoint=$API_ENDPOINT
APIKey=$API_KEY
TerminalId=$TERMINAL_ID
HeartbeatInterval=30
SyncInterval=60
EOF

# Fallback runtime config consumed directly by EA when startup input parameters
# are not propagated by MT5 startup.
cat > "$MT5_FILES_DIR/TradeTaperSync.cfg" << EOF
APIEndpoint=$API_ENDPOINT
APIKey=$API_KEY
TerminalId=$TERMINAL_ID
HeartbeatInterval=30
SyncInterval=60
EOF

# Remove stale lowercase config file from older versions to prevent ambiguity.
rm -f "$MT5_BASE_DIR/config/terminal.ini" 2>/dev/null || true

cat > "$MT5_CONFIG_DIR/terminal.ini" << EOF
[Common]
Login=$MT5_LOGIN
Password=$MT5_PASSWORD
Server=$MT5_SERVER
ProxyEnable=0
AutoConfiguration=1
NewsEnable=0

[Charts]
ProfileLast=Default

[Experts]
AllowLiveTrading=1
AllowDllImport=0
Enabled=1
Account=0
Profile=0
WebRequest=1
WebRequestUrl=$API_ENDPOINT

[StartUp]
Expert=TradeTaperSync.ex5
ExpertParameters=$EA_PRESET_FILE
Symbol=EURUSD
Period=H1
EOF

echo "Configuration written to $MT5_CONFIG_DIR/terminal.ini"
# Mirror config to a no-space path so /config can be parsed reliably.
cp "$MT5_CONFIG_DIR/terminal.ini" "$MT5_CONFIG_MOUNT_DIR/terminal.ini"

# Copy EA to MT5 folder if not already there
EA_SOURCE="/home/trader/mt5/MQL5/Experts/TradeTaperSync.mq5"
EA_DEST="/home/trader/.wine/drive_c/Program Files/MetaTrader 5/MQL5/Experts/TradeTaperSync.mq5"
EA_COMPILE_TIMEOUT_SECONDS="${EA_COMPILE_TIMEOUT_SECONDS:-120}"

compile_ea() {
    local mt5_dir="/home/trader/.wine/drive_c/Program Files/MetaTrader 5"

    cd "$mt5_dir" || return 1
    mkdir -p "MQL5/Logs"
    rm -f "MQL5/Logs/compile.log"

    # Kill stale compiler processes from prior retries so timeout is effective.
    pkill -f metaeditor64.exe >/dev/null 2>&1 || true

    echo "Compiling EA (timeout: ${EA_COMPILE_TIMEOUT_SECONDS}s)..."
    if timeout "${EA_COMPILE_TIMEOUT_SECONDS}s" wine metaeditor64.exe \
        /portable \
        /compile:MQL5\\Experts\\TradeTaperSync.mq5 \
        /log:MQL5\\Logs\\compile.log; then
        if [ -f "MQL5/Experts/TradeTaperSync.ex5" ]; then
            echo "Compilation successful"
            return 0
        fi
        echo "Compilation exited without generating TradeTaperSync.ex5"
    else
        local code=$?
        if [ "$code" -eq 124 ]; then
            echo "Compilation timed out after ${EA_COMPILE_TIMEOUT_SECONDS}s"
        else
            echo "Compilation failed with exit code $code"
        fi
    fi

    # Ensure no stuck compiler keeps the container alive without progressing.
    pkill -f metaeditor64.exe >/dev/null 2>&1 || true

    echo "Compilation FAILED. Log content:"
    cat "MQL5/Logs/compile.log" || echo "No log file generated"
    return 1
}

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
        if ! compile_ea; then
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
    # MT5 may ignore relative /config values and silently fallback to defaults.
    # Use a no-space host path mapped via Z: to avoid quoting edge-cases.
    wine terminal64.exe /portable /profile:Default /config:Z:\\home\\trader\\config\\terminal.ini &
    
    echo "MT5 terminal started"
    
    # Keep container running
    wait
else
    echo "Error: MT5 terminal executable not found at $MT5_EXE"
    echo "Listing Program Files:"
    ls -F "/home/trader/.wine/drive_c/Program Files/"
    exit 1
fi
