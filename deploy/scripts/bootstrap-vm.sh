#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  sudo bash deploy/scripts/bootstrap-vm.sh production <deploy-user> "<ssh-public-key>"

Example:
  sudo bash deploy/scripts/bootstrap-vm.sh production snaptrip-deploy "ssh-ed25519 AAAAC3... github-actions-production"

This script:
  - installs Docker Engine and the Compose plugin on Ubuntu/Debian
  - creates the deployment user if missing
  - installs the provided SSH public key into authorized_keys
  - adds the deployment user to the docker group
  - creates the /opt/snaptrip/hosted release and shared directories
  - enables a basic UFW policy for SSH, HTTP, and HTTPS when UFW is available
EOF
}

if [[ $# -ne 3 ]]; then
  usage
  exit 1
fi

APP_ENV="$1"
DEPLOY_USER="$2"
DEPLOY_SSH_PUBLIC_KEY="$3"
BASE_DIR="/opt/snaptrip/hosted"

if [[ "${APP_ENV}" != "production" ]]; then
  echo "APP_ENV must be 'production'." >&2
  exit 1
fi

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root or with sudo." >&2
  exit 1
fi

if [[ -z "${DEPLOY_SSH_PUBLIC_KEY// }" ]]; then
  echo "SSH public key must not be empty." >&2
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This bootstrap script targets Ubuntu/Debian hosts with apt-get." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get upgrade -y

DOCKER_COMPOSE_PACKAGE="docker-compose-plugin"
if ! apt-cache show "${DOCKER_COMPOSE_PACKAGE}" >/dev/null 2>&1; then
  DOCKER_COMPOSE_PACKAGE="docker-compose-v2"
fi

apt-get install -y ca-certificates curl git python3 ufw docker.io "${DOCKER_COMPOSE_PACKAGE}"

systemctl enable docker
systemctl start docker

if ! id -u "${DEPLOY_USER}" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "${DEPLOY_USER}"
fi

usermod -aG docker "${DEPLOY_USER}"

USER_HOME="/home/${DEPLOY_USER}"
SSH_DIR="${USER_HOME}/.ssh"
AUTHORIZED_KEYS="${SSH_DIR}/authorized_keys"

install -d -m 700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${SSH_DIR}"
touch "${AUTHORIZED_KEYS}"
chmod 600 "${AUTHORIZED_KEYS}"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${AUTHORIZED_KEYS}"

if ! grep -Fqx "${DEPLOY_SSH_PUBLIC_KEY}" "${AUTHORIZED_KEYS}"; then
  printf '%s\n' "${DEPLOY_SSH_PUBLIC_KEY}" >> "${AUTHORIZED_KEYS}"
fi

install -d -m 755 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" \
  "${BASE_DIR}" \
  "${BASE_DIR}/releases" \
  "${BASE_DIR}/shared" \
  "${BASE_DIR}/shared/caddy-data" \
  "${BASE_DIR}/shared/caddy-config" \
  "${BASE_DIR}/shared/mongo-data"

touch "${BASE_DIR}/deploy.lock"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${BASE_DIR}/deploy.lock"

if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
fi

cat <<EOF
VM bootstrap complete.

Environment: ${APP_ENV}
Deploy user: ${DEPLOY_USER}
Base directory: ${BASE_DIR}

Next checks:
  1. Reconnect as ${DEPLOY_USER} and run: docker version && docker compose version
  2. Confirm SSH access with the paired private key from GitHub Actions.
  3. Save this host key into PRODUCTION_VM_SSH_KNOWN_HOSTS:
     ssh-keyscan -H <vm-hostname-or-ip>
EOF
