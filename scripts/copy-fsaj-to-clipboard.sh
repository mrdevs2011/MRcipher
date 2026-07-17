#!/bin/bash
# Lokal .env.local dan FIREBASE_SERVICE_ACCOUNT_JSON qiymatini clipboard ga nusxa oladi
set -e

cd "$(dirname "$0")/.."

grep -E '^FIREBASE_SERVICE_ACCOUNT_JSON=' .env.local | sed 's/^FIREBASE_SERVICE_ACCOUNT_JSON=//' | xclip -selection clipboard

byte_count=$(grep -E '^FIREBASE_SERVICE_ACCOUNT_JSON=' .env.local | sed 's/^FIREBASE_SERVICE_ACCOUNT_JSON=//' | wc -c)
echo "FIREBASE_SERVICE_ACCOUNT_JSON clipboard ga nusxa olindi. Hajmi: $byte_count bayt"
