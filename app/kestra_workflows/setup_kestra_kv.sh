#!/bin/bash
# Kestra KV Store Setup Script
# Reads KV pairs from kestra_kv.yml and syncs them to Kestra namespace.
# Clears existing KV pairs and loads fresh values on each run.
#
# Usage: ./setup_kestra_kv.sh [KESTRA_URL]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KV_SOURCE_FILE="$SCRIPT_DIR/kestra_kv.yml"

KESTRA_URL="${1:-http://localhost:8080}"
NAMESPACE="doomsday.watchers"
KESTRA_USER="admin@kestra.io"
KESTRA_PASS="Admin123"

echo "Kestra KV Store Setup"
echo "  URL:       $KESTRA_URL"
echo "  Namespace: $NAMESPACE"
echo "  Source:    $KV_SOURCE_FILE"
echo ""

if [ ! -f "$KV_SOURCE_FILE" ]; then
    echo "Error: KV source file not found: $KV_SOURCE_FILE"
    exit 1
fi

# Clear existing KV pairs
echo "Clearing existing KV pairs..."
existing_keys=$(curl -s -u "$KESTRA_USER:$KESTRA_PASS" \
    "$KESTRA_URL/api/v1/namespaces/$NAMESPACE/kv" | \
    python3 -c "import sys, json; keys = json.load(sys.stdin); print('\n'.join([k['key'] for k in keys]))" 2>/dev/null || echo "")

if [ -n "$existing_keys" ]; then
    while IFS= read -r key; do
        if [ -n "$key" ]; then
            curl -s -u "$KESTRA_USER:$KESTRA_PASS" \
                -X DELETE "$KESTRA_URL/api/v1/namespaces/$NAMESPACE/kv/$key" > /dev/null
            echo "  Deleted: $key"
        fi
    done <<< "$existing_keys"
else
    echo "  No existing keys found"
fi

echo ""
echo "Loading KV pairs from kestra_kv.yml..."

# Parse YAML and set KV pairs
while IFS= read -r line; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    
    if [[ "$line" =~ ^([a-zA-Z0-9_]+):[[:space:]]*\"?([^\"]+)\"?$ ]]; then
        key="${BASH_REMATCH[1]}"
        value="${BASH_REMATCH[2]}"
        
        # Use stdin to avoid issues with - being interpreted as option
        response=$(echo -n "$value" | curl -s -w "%{http_code}" -X PUT \
            -u "$KESTRA_USER:$KESTRA_PASS" \
            -H "Content-Type: text/plain" \
            "$KESTRA_URL/api/v1/namespaces/$NAMESPACE/kv/$key" \
            --data-binary @-)
        
        http_code="${response: -3}"
        
        if [ "$http_code" = "200" ] || [ "$http_code" = "204" ] || [ "$http_code" = "201" ]; then
            echo "  Set: $key = $value"
        else
            echo "  Failed: $key (HTTP $http_code)"
        fi
    fi
done < "$KV_SOURCE_FILE"

echo ""
echo "Verifying KV pairs..."
curl -s -u "$KESTRA_USER:$KESTRA_PASS" \
    "$KESTRA_URL/api/v1/namespaces/$NAMESPACE/kv" | python3 -m json.tool 2>/dev/null

echo ""
echo "Done."
