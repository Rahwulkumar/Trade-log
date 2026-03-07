#!/bin/bash
# Bridge queued MT5 webhook payloads to Trading Journal API using curl.
# This is used when MT5 blocks WebRequest (e.g. error 4014).

set -u

MT5_FILES_DIR="/home/trader/.wine/drive_c/Program Files/MetaTrader 5/MQL5/Files"
OUTBOX_DIR="$MT5_FILES_DIR/bridge_outbox"
POLL_SECONDS="${WEBHOOK_BRIDGE_POLL_SECONDS:-2}"

API_KEY="${API_KEY:-}"
if [ -z "$API_KEY" ] && [ -n "${TERMINAL_WEBHOOK_SECRET:-}" ]; then
    API_KEY="$TERMINAL_WEBHOOK_SECRET"
fi
API_KEY="$(printf '%s' "$API_KEY" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

mkdir -p "$OUTBOX_DIR"
echo "Webhook bridge started. Outbox=$OUTBOX_DIR Poll=${POLL_SECONDS}s"

while true; do
    found=0

    for file in "$OUTBOX_DIR"/*.req; do
        if [ ! -f "$file" ]; then
            continue
        fi

        found=1

        url="$(sed -n '1p' "$file" | tr -d '\r')"
        body="$(sed -n '2,$p' "$file" | tr -d '\r')"

        if [ -z "$url" ] || [ -z "$body" ]; then
            echo "Skipping malformed payload file: $(basename "$file")"
            mv "$file" "$file.bad" 2>/dev/null || rm -f "$file"
            continue
        fi

        tmp_resp="$(mktemp)"
        if [ -n "$API_KEY" ]; then
            status="$(curl -sS --max-time 10 -o "$tmp_resp" -w "%{http_code}" \
                -H "Content-Type: application/json" \
                -H "x-api-key: $API_KEY" \
                --data "$body" \
                "$url" || true)"
        else
            status="$(curl -sS --max-time 10 -o "$tmp_resp" -w "%{http_code}" \
                -H "Content-Type: application/json" \
                --data "$body" \
                "$url" || true)"
        fi
        if [ -z "$status" ]; then
            status="000"
        fi

        if [[ "$status" =~ ^[0-9]+$ ]] && [ "$status" -ge 200 ] && [ "$status" -lt 300 ]; then
            rm -f "$file"
            echo "Delivered queued payload: $(basename "$file") status=$status"
        else
            resp_preview="$(tr -d '\n' < "$tmp_resp" | cut -c1-300)"
            echo "Delivery failed: $(basename "$file") status=$status response=$resp_preview"
        fi

        rm -f "$tmp_resp"
        sleep 1
    done

    if [ "$found" -eq 0 ]; then
        sleep "$POLL_SECONDS"
    fi
done
