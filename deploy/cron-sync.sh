#!/usr/bin/env bash
# Hourly (or manual) calendar sync via POST /api/cron/sync. Requires repo root .env with CRON_SECRET.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
TOKEN=$(grep '^CRON_SECRET=' "$ROOT/.env" | cut -d= -f2-)
URL="${CRON_SYNC_URL:-https://kiken-fika.13pixlar.se/api/cron/sync}"
curl -sS -f -X POST "$URL" -H "x-cron-token: ${TOKEN}" -o /dev/null
