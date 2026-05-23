#!/usr/bin/env bash
set -euo pipefail

READY_URL="${1:?READY_URL is required}"

payload="$(curl --fail --silent --show-error --location "${READY_URL}")"

compact_payload="$(printf '%s' "${payload}" | tr -d '[:space:]')"

case "${compact_payload}" in
  *'"ready":true'*'"dependencies":{'*'"mongo":"ok"'*'"gridfs":"ok"'* | \
  *'"ready":true'*'"dependencies":{'*'"gridfs":"ok"'*'"mongo":"ok"'*)
    ;;
  *)
    echo "Unexpected readiness payload: ${payload}" >&2
    exit 1
    ;;
esac
