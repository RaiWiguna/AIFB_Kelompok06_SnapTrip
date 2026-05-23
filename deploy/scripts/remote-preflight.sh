#!/usr/bin/env bash
set -euo pipefail

APP_ENV="${1:?APP_ENV is required}"
RELEASE_SHA="${2:?RELEASE_SHA is required}"
BASE_DIR="${3:?BASE_DIR is required}"
RUNTIME_ENV_FILE="${4:?RUNTIME_ENV_FILE is required}"
WEB_DOMAIN="${5:?WEB_DOMAIN is required}"
API_DOMAIN="${6:?API_DOMAIN is required}"
EXPECTED_HOST="${7:?EXPECTED_HOST is required}"

RELEASE_DIR="${BASE_DIR}/releases/${RELEASE_SHA}"
COMPOSE_FILE="${RELEASE_DIR}/deploy/compose/docker-compose.remote.yml"

if [[ "${APP_ENV}" != "production" ]]; then
  echo "APP_ENV must be production." >&2
  exit 1
fi

for command_name in docker getent awk sort grep; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Required command missing: ${command_name}" >&2
    exit 1
  fi
done

for path in "${BASE_DIR}" "${BASE_DIR}/releases" "${BASE_DIR}/shared"; do
  if [[ ! -d "${path}" ]]; then
    echo "Required directory missing: ${path}" >&2
    exit 1
  fi
  if [[ ! -w "${path}" ]]; then
    echo "Required directory is not writable by deploy user: ${path}" >&2
    exit 1
  fi
done

for path in \
  "${BASE_DIR}/shared/caddy-data" \
  "${BASE_DIR}/shared/caddy-config" \
  "${BASE_DIR}/shared/mongo-data"; do
  mkdir -p "${path}"
  if [[ ! -d "${path}" ]]; then
    echo "Shared bind-mount directory missing: ${path}" >&2
    exit 1
  fi
done

if [[ ! -d "${RELEASE_DIR}" ]]; then
  echo "Release directory not found: ${RELEASE_DIR}" >&2
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi

if [[ ! -s "${RUNTIME_ENV_FILE}" ]]; then
  echo "Runtime env file missing or empty: ${RUNTIME_ENV_FILE}" >&2
  exit 1
fi

for required_name in \
  APP_ENV RELEASE_SHA COMPOSE_PROJECT_NAME SHARED_DIR WEB_DOMAIN API_DOMAIN CADDY_EMAIL \
  MONGO_ROOT_USERNAME MONGO_ROOT_PASSWORD MONGO_DATABASE SESSION_SECRET COOKIE_DOMAIN GRIDFS_BUCKET \
  CLASSIFIER_MODE CLASSIFIER_MODEL_VERSION GEMINI_API_KEY GEMINI_MODEL GOOGLE_PLACES_API_KEY \
  NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY; do
  if ! grep -Eq "^${required_name}=.+" "${RUNTIME_ENV_FILE}"; then
    echo "Runtime env is missing required value: ${required_name}" >&2
    exit 1
  fi
done

docker info >/dev/null
docker compose version >/dev/null
docker compose --env-file "${RUNTIME_ENV_FILE}" -f "${COMPOSE_FILE}" config >/dev/null

resolve_domain() {
  local domain="$1"
  getent ahostsv4 "${domain}" | awk '{print $1}' | sort -u
}

is_ipv4() {
  [[ "$1" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]
}

check_domain() {
  local domain="$1"
  local resolved
  resolved="$(resolve_domain "${domain}")"
  if [[ -z "${resolved}" ]]; then
    echo "DNS did not resolve an IPv4 address for ${domain}." >&2
    exit 1
  fi

  echo "${domain} resolves to:"
  echo "${resolved}" | sed 's/^/  - /'

  if is_ipv4 "${EXPECTED_HOST}" && ! grep -Fxq "${EXPECTED_HOST}" <<<"${resolved}"; then
    echo "${domain} does not resolve to expected VM IP ${EXPECTED_HOST}." >&2
    exit 1
  fi
}

check_domain "${WEB_DOMAIN}"
check_domain "${API_DOMAIN}"

echo "Remote preflight passed for ${RELEASE_SHA}."
