#!/bin/bash
# Kestra KV Store Setup Script
# Reads KV pairs from kestra_kv.yml and syncs them to ALL Kestra namespaces.
# Clears existing KV pairs and loads fresh values on each run.
# Usage: ./setup_kestra_kv.sh [KESTRA_URL]
#
# NOTE: Kestra KV API Quirk
# -------------------------
# Values sent via text/plain are parsed as Pebble expressions.
# Unquoted "gemini-2.5-flash-lite" is evaluated as: gemini - 2.5 - flash - lite
# This returns just "gemini" since hyphens are treated as minus operators.
# FIX: Wrap all values in double quotes so Kestra treats them as literal strings.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KV_SOURCE_FILE="$SCRIPT_DIR/kestra_kv.yml"

KESTRA_URL="${1:-http://localhost:8080}"    # Default Localhost
KESTRA_USER="admin@kestra.io"
KESTRA_PASS="Admin123"

# All namespaces that need KV values
NAMESPACES=(
    "doomsday.watchers"    # W1: Watcher creation & rescan
    "doomsday.guardians"   # W2: Observation loop
    "doomsday.avengers"    # W3: Analysis
    "doomsday.assemble"    # W3 response, W4: Kill zombie
)

echo "=============================================="
echo "Kestra KV Store Setup - All Namespaces"
echo "=============================================="
echo "  URL:    $KESTRA_URL"
echo "  Source: $KV_SOURCE_FILE"
echo ""

if [ ! -f "$KV_SOURCE_FILE" ]; then
    echo "Error: KV source file not found: $KV_SOURCE_FILE"
    exit 1
fi

# Function to setup KV for a namespace
setup_namespace_kv() {
    local NAMESPACE="$1"
    echo ""
    echo "----------------------------------------------"
    echo "Namespace: $NAMESPACE"
    echo "----------------------------------------------"
    
    # Clear existing KV pairs
    echo "  Clearing existing KV pairs..."
    existing_keys=$(curl -s -u "$KESTRA_USER:$KESTRA_PASS" \
        "$KESTRA_URL/api/v1/namespaces/$NAMESPACE/kv" | \
        python3 -c "import sys, json; keys = json.load(sys.stdin); print('\n'.join([k['key'] for k in keys]))" 2>/dev/null || echo "")

    if [ -n "$existing_keys" ]; then
        while IFS= read -r key; do
            if [ -n "$key" ]; then
                curl -s -u "$KESTRA_USER:$KESTRA_PASS" \
                    -X DELETE "$KESTRA_URL/api/v1/namespaces/$NAMESPACE/kv/$key" > /dev/null
                echo "    Deleted: $key"
            fi
        done <<< "$existing_keys"
    else
        echo "    No existing keys found"
    fi

    echo "  Loading KV pairs..."
    
    # Parse YAML using Python and set each KV pair via requests library
    python3 << 'PYTHON_SCRIPT'
import yaml
import requests
import os

kv_file = os.environ.get('KV_SOURCE_FILE')
namespace = os.environ.get('NAMESPACE')
kestra_url = os.environ.get('KESTRA_URL')
kestra_user = os.environ.get('KESTRA_USER')
kestra_pass = os.environ.get('KESTRA_PASS')

with open(kv_file, 'r') as f:
    data = yaml.safe_load(f)

if data:
    for key, value in data.items():
        url = f'{kestra_url}/api/v1/namespaces/{namespace}/kv/{key}'
        # Wrap value in quotes for Kestra KV API
        quoted_value = f'"{value}"'
        response = requests.put(
            url,
            auth=(kestra_user, kestra_pass),
            headers={'Content-Type': 'text/plain'},
            data=quoted_value
        )
        if response.status_code in [200, 201, 204]:
            print(f'    Set: {key}')
        else:
            print(f'    Failed: {key} (HTTP {response.status_code})')
PYTHON_SCRIPT
}

# Export variables for Python subprocess
export KV_SOURCE_FILE KESTRA_URL KESTRA_USER KESTRA_PASS

# Setup KV for all namespaces
for ns in "${NAMESPACES[@]}"; do
    export NAMESPACE="$ns"
    setup_namespace_kv "$ns"
done

echo ""
echo "=============================================="
echo "Verifying KV pairs in all namespaces..."
echo "=============================================="

for ns in "${NAMESPACES[@]}"; do
    echo ""
    echo "$ns:"
    curl -s -u "$KESTRA_USER:$KESTRA_PASS" \
        "$KESTRA_URL/api/v1/namespaces/$ns/kv" | \
        python3 -c "import sys, json; [print(f'  - {k[\"key\"]}') for k in json.load(sys.stdin)]" 2>/dev/null || echo "  (empty)"
done

echo ""
echo "=============================================="
echo "KV Setup Complete!"
echo "=============================================="
