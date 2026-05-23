#!/usr/bin/env bash
set -euo pipefail

APP_ENV="${1:?APP_ENV is required}"
RELEASE_SHA="${2:?RELEASE_SHA is required}"
BASE_DIR="${3:?BASE_DIR is required}"
RUNTIME_ENV_FILE="${4:?RUNTIME_ENV_FILE is required}"
PREVIOUS_RELEASE_SHA="${5:-}"
WEB_URL="${6:-}"
API_HEALTH_URL="${7:-}"
API_READY_URL="${8:-}"

RELEASE_DIR="${BASE_DIR}/releases/${RELEASE_SHA}"
COMPOSE_FILE="${RELEASE_DIR}/deploy/compose/docker-compose.remote.yml"
CURRENT_LINK="${BASE_DIR}/current"
CURRENT_RELEASE_FILE="${BASE_DIR}/current_release"
LOCK_FILE="${BASE_DIR}/deploy.lock"

if [[ "${APP_ENV}" != "production" ]]; then
  echo "APP_ENV must be production." >&2
  exit 1
fi

if [[ ! -d "${RELEASE_DIR}" ]]; then
  echo "Release directory not found: ${RELEASE_DIR}" >&2
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi

if [[ ! -f "${RUNTIME_ENV_FILE}" ]]; then
  echo "Runtime env file not found: ${RUNTIME_ENV_FILE}" >&2
  exit 1
fi

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  echo "Another SnapTrip deploy or rollback is already running." >&2
  exit 1
fi

compose() {
  docker compose \
    --project-name "snaptrip-${APP_ENV}" \
    --env-file "${RUNTIME_ENV_FILE}" \
    -f "${COMPOSE_FILE}" \
    "$@"
}

wait_for_service() {
  local service="$1"
  local timeout_seconds="${2:-180}"
  local started_at
  local container_id
  local status

  started_at="$(date +%s)"

  while true; do
    container_id="$(compose ps -q "${service}" 2>/dev/null || true)"

    if [[ -n "${container_id}" ]]; then
      status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "${container_id}" 2>/dev/null || true)"

      case "${status}" in
        healthy|running)
          echo "Service ${service} is ${status}."
          return 0
          ;;
        unhealthy|exited|dead)
          echo "Service ${service} entered bad state: ${status}" >&2
          docker inspect --format '{{json .State.Health}}' "${container_id}" >&2 || true
          docker logs "${container_id}" --tail 150 >&2 || true
          return 1
          ;;
      esac
    fi

    if (( "$(date +%s)" - started_at >= timeout_seconds )); then
      echo "Timed out waiting for ${service} to become ready." >&2
      if [[ -n "${container_id}" ]]; then
        docker inspect --format '{{json .State.Health}}' "${container_id}" >&2 || true
        docker logs "${container_id}" --tail 150 >&2 || true
      fi
      return 1
    fi

    sleep 5
  done
}

run_public_checks() {
  if [[ -z "${WEB_URL}" || -z "${API_HEALTH_URL}" || -z "${API_READY_URL}" ]]; then
    echo "Public smoke URLs were not provided; skipping public checks before promotion." >&2
    return 0
  fi

  bash "${RELEASE_DIR}/deploy/scripts/smoke-check.sh" \
    "${WEB_URL}" \
    "${API_HEALTH_URL}" \
    "${API_READY_URL}"
  bash "${RELEASE_DIR}/deploy/scripts/assert-ready.sh" "${API_READY_URL}"
}

mkdir -p \
  "${BASE_DIR}/shared" \
  "${BASE_DIR}/shared/caddy-data" \
  "${BASE_DIR}/shared/caddy-config" \
  "${BASE_DIR}/shared/mongo-data"

compose up -d --build --remove-orphans mongo
wait_for_service mongo 180

compose up -d --build --remove-orphans api
wait_for_service api 300

compose up -d --build --remove-orphans web
wait_for_service web 300

compose up -d --build --remove-orphans caddy
wait_for_service caddy 120

run_public_checks

ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}.tmp"
mv -Tf "${CURRENT_LINK}.tmp" "${CURRENT_LINK}"

tmp_release_file="$(mktemp "${BASE_DIR}/current_release.XXXXXX")"
printf '%s\n' "${RELEASE_SHA}" > "${tmp_release_file}"
mv -f "${tmp_release_file}" "${CURRENT_RELEASE_FILE}"

active_release="$(readlink -f "${CURRENT_LINK}")"
previous_release=""
if [[ -n "${PREVIOUS_RELEASE_SHA}" ]]; then
  previous_release="$(readlink -f "${BASE_DIR}/releases/${PREVIOUS_RELEASE_SHA}" 2>/dev/null || true)"
fi
find "${BASE_DIR}/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
  | sort -nr \
  | awk -v active="${active_release}" -v previous="${previous_release}" 'NR>5 && $2 != active && (previous == "" || $2 != previous) {print $2}' \
  | xargs -r rm -rf

echo "SnapTrip release ${RELEASE_SHA} is active."
