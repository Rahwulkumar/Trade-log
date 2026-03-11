#!/bin/bash
# Monitor the EA session status file and emit explicit broker-session diagnostics.

set -u

MT5_BASE_DIR="/home/trader/.wine/drive_c/Program Files/MetaTrader 5"
MT5_FILES_DIR="$MT5_BASE_DIR/MQL5/Files"
SESSION_STATUS_FILE="$MT5_FILES_DIR/session_status.json"
STATE_DIR="/home/trader/state"
POLL_SECONDS="${MT5_SESSION_POLL_SECONDS:-5}"
READY_TIMEOUT_SECONDS="${MT5_SESSION_READY_TIMEOUT_SECONDS:-150}"
REQUIRE_BROKER_SESSION="${MT5_REQUIRE_BROKER_SESSION:-true}"
FAIL_FAST_ON_TIMEOUT="${MT5_FAIL_FAST_ON_SESSION_TIMEOUT:-false}"

mkdir -p "$STATE_DIR"

log() {
    printf '%s %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

start_ts="$(date +%s)"
ready_reported=0
timeout_reported=0

log "Session watchdog started. Require=$REQUIRE_BROKER_SESSION Timeout=${READY_TIMEOUT_SECONDS}s Poll=${POLL_SECONDS}s"

while true; do
    now_ts="$(date +%s)"

    if [ -f "$SESSION_STATUS_FILE" ] && grep -q '"ready":[[:space:]]*true' "$SESSION_STATUS_FILE"; then
        if [ "$ready_reported" -eq 0 ]; then
            cp "$SESSION_STATUS_FILE" "$STATE_DIR/session_status.last.json" 2>/dev/null || true
            printf 'READY\n' > "$STATE_DIR/session_watchdog.status"
            log "Broker session reported ready."
            ready_reported=1
            timeout_reported=0
        fi
        sleep "$POLL_SECONDS"
        continue
    fi

    if [ "$REQUIRE_BROKER_SESSION" = "true" ] && [ "$timeout_reported" -eq 0 ] && [ $((now_ts - start_ts)) -ge "$READY_TIMEOUT_SECONDS" ]; then
        printf 'TIMEOUT\n' > "$STATE_DIR/session_watchdog.status"
        if [ -f "$SESSION_STATUS_FILE" ]; then
            cp "$SESSION_STATUS_FILE" "$STATE_DIR/session_status.last.json" 2>/dev/null || true
            log "Broker session not ready after ${READY_TIMEOUT_SECONDS}s. Last status:"
            tr -d '\n' < "$SESSION_STATUS_FILE"
            printf '\n'
        else
            log "Broker session not ready after ${READY_TIMEOUT_SECONDS}s. session_status.json was never written."
        fi

        timeout_reported=1

        if [ "$FAIL_FAST_ON_TIMEOUT" = "true" ]; then
            log "Fail-fast enabled. Terminating terminal64.exe so supervisor can restart MT5."
            pkill -f terminal64.exe >/dev/null 2>&1 || true
        fi
    fi

    sleep "$POLL_SECONDS"
done
