# Load Testing — Warehouse Dashboard

k6-based load/stress/soak tests for the Warehouse Dashboard (Next.js + SQLite).

## Prerequisites

```bash
# Install k6 (Ubuntu/Debian)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Verify
k6 version
```

## Run the server under test

Use an isolated database + storage (never the production one):

```bash
export WH_DB_PATH=/tmp/wh-loadtest.db
export STORAGE_PATH=/tmp/wh-loadtest-storage
export WH_SETTINGS_PATH=/tmp/wh-loadtest-settings.json
rm -f "$WH_DB_PATH" "$WH_SETTINGS_PATH"
rm -rf "$STORAGE_PATH"
mkdir -p "$STORAGE_PATH"

# Start server (dev or production)
bun run dev            # http://127.0.0.1:8080
# or
bun run build && bun run start:next   # http://127.0.0.1:8080
```

Default base URL is `http://127.0.0.1:8080`. Override with `BASE_URL`.

## Scenarios

| Profile | File | Users | Duration | Purpose |
|---|---|---|---|---|
| Smoke | `smoke.js` | 1-5 | 30s | Sanity check, no errors |
| Load | `load.js` | 10-20 | 2m | Normal expected load |
| Stress | `stress.js` | ramp to 100 | 5m | Find breaking point |
| Soak | `soak.js` | 20 steady | 30m | Memory/connection leaks |

## Run

```bash
# Smoke (default)
BASE_URL=http://127.0.0.1:8080 k6 run tests/load/k6/smoke.js

# Load
BASE_URL=http://127.0.0.1:8080 k6 run tests/load/k6/load.js

# Stress
BASE_URL=http://127.0.0.1:8080 k6 run tests/load/k6/stress.js

# Soak
BASE_URL=http://127.0.0.1:8080 k6 run tests/load/k6/soak.js

# Single scenario
BASE_URL=http://127.0.0.1:8080 k6 run tests/load/k6/scenarios/admin-read.js
```

## What is tested

- **Admin read** (local-only, no LINE): orders list, order detail, images, line-walks, register queue, settings
- **Admin write**: approve/revoke user, delete order
- **LIFF endpoints**: require a LINE session token — see "LIFF auth" below

## LIFF auth in load tests

The LIFF upload flow requires a verified LINE identity (ADR 0003). In load tests we cannot mint real LINE tokens, so:

- Admin-surface endpoints (local-only) are tested directly.
- LIFF endpoints are tested with a seeded session cookie (see `tests/e2e/support/data.ts` for the seeding pattern used by Playwright).
- Set `LIFF_SESSION_TOKEN` env var to a valid session cookie value to exercise upload scenarios.

## Interpreting results

Key metrics:
- `http_req_duration` p95/p99 (read < 500ms, upload < 2s target)
- `http_req_failed` rate (< 1% target)
- `http_reqs` throughput (req/s)

SQLite-specific watch items:
- `busy_timeout` hits (5s) → write contention
- WAL checkpoint lag
- Memory growth over soak runs

## Thresholds

Each profile sets thresholds; a run exits non-zero if thresholds fail, suitable for CI gating.
