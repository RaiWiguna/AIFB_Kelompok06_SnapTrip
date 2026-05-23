#!/usr/bin/env bash
set -euo pipefail

READY_URL="${1:?READY_URL is required}"

payload="$(curl --fail --silent --show-error --location "${READY_URL}")"

python - "${payload}" <<'PY'
import json
import sys

payload = json.loads(sys.argv[1])
dependencies = payload.get("dependencies") or {}
if payload.get("ready") is not True:
    raise SystemExit(f"Unexpected readiness payload: {payload}")
if dependencies.get("mongo") != "ok" or dependencies.get("gridfs") != "ok":
    raise SystemExit(f"Unexpected readiness dependencies: {payload}")
PY
