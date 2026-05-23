#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -lt 1 ]]; then
  echo "Provide one or more URLs to smoke-check." >&2
  exit 1
fi

SMOKE_RETRY_COUNT="${SMOKE_RETRY_COUNT:-60}"
SMOKE_RETRY_DELAY="${SMOKE_RETRY_DELAY:-5}"

for url in "$@"; do
  echo "Checking ${url}"
  curl \
    --fail \
    --silent \
    --show-error \
    --location \
    --connect-timeout 10 \
    --max-time 30 \
    --retry "${SMOKE_RETRY_COUNT}" \
    --retry-delay "${SMOKE_RETRY_DELAY}" \
    --retry-connrefused \
    --retry-all-errors \
    "${url}" > /dev/null
done
