#!/usr/bin/env bash
#
# Kubek installer
#   curl -fsSL https://raw.githubusercontent.com/Seeroy/kubek-minecraft-dashboard/main/install.sh | bash
#
# Detects your system, then installs Kubek as a native binary or via Docker.
# If both are possible it asks which one you want.
#
# Options:
#   --docker          Use Docker Compose
#   --binary          Use the native binary
#   --dir <path>      Install directory (default: ./kubek)
#   --version <tag>   Release tag, e.g. v4.0.0 (default: latest)
#   --no-run          Install but don't start
#   -y, --yes         Don't ask, use defaults
#   -h, --help        Show this help
#
set -euo pipefail

REPO="Seeroy/kubek-minecraft-dashboard"
IMAGE="seeroy/kubek-minecraft-dashboard:latest"
DEFAULT_DIR="./kubek"
PORT="${PORT:-8000}"

# colors
if [ -t 1 ]; then
  B="$(printf '\033[1m')"; D="$(printf '\033[2m')"; R="$(printf '\033[0m')"
  GRN="$(printf '\033[32m')"; BLU="$(printf '\033[34m')"; YEL="$(printf '\033[33m')"; RED="$(printf '\033[31m')"
else
  B=""; D=""; R=""; GRN=""; BLU=""; YEL=""; RED=""
fi
info() { printf '%s %s\n' "${BLU}>${R}" "$*"; }
ok()   { printf '%s %s\n' "${GRN}ok${R}" "$*"; }
warn() { printf '%s %s\n' "${YEL}!${R}" "$*"; }
die()  { printf '%s %s\n' "${RED}error:${R}" "$*" >&2; exit 1; }

have() { command -v "$1" >/dev/null 2>&1; }

usage() {
  cat <<EOF
Kubek installer

Usage:
  curl -fsSL .../install.sh | bash
  curl -fsSL .../install.sh | bash -s -- [options]

Options:
  --docker          Use Docker Compose
  --binary          Use the native binary
  --dir <path>      Install directory (default: ./kubek)
  --version <tag>   Release tag, e.g. v4.0.0 (default: latest)
  --no-run          Install but don't start
  -y, --yes         Don't ask, use defaults
  -h, --help        Show this help
EOF
}

# prompt helpers, read from the terminal even when piped through curl
TTY=""
[ -e /dev/tty ] && TTY=/dev/tty

ask() { # ask "question" "default"; sets REPLY
  local q="$1" def="${2:-}"
  if [ "$YES" = "1" ] || [ -z "$TTY" ]; then REPLY="$def"; return; fi
  printf '%s %s ' "${BLU}?${R}" "$q" > "$TTY"
  read -r REPLY < "$TTY" || REPLY="$def"
  [ -n "$REPLY" ] || REPLY="$def"
}

confirm() { # confirm "question"; returns 0 for yes
  ask "$1 [Y/n]" "y"
  case "$REPLY" in [Nn]*) return 1 ;; *) return 0 ;; esac
}

# args
MODE="auto"
INSTALL_DIR="$DEFAULT_DIR"
VERSION="latest"
RUN=1
YES=0

while [ $# -gt 0 ]; do
  case "$1" in
    --docker)  MODE="docker" ;;
    --binary)  MODE="binary" ;;
    --dir)     INSTALL_DIR="${2:?--dir needs a path}"; shift ;;
    --version) VERSION="${2:?--version needs a tag}"; shift ;;
    --no-run)  RUN=0 ;;
    -y|--yes)  YES=1 ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown option: $1 (see --help)" ;;
  esac
  shift
done

# detect os + arch
OS=""; ARCH=""; ASSET=""; BINARY_OK=0
case "$(uname -s)" in
  Linux)  OS="linux" ;;
  Darwin) OS="darwin" ;;
esac
case "$(uname -m)" in
  x86_64|amd64)  ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
esac
# binaries published by the build pipeline
case "${OS}-${ARCH}" in
  linux-x64)    ASSET="linux-x64"; BINARY_OK=1 ;;
  darwin-arm64) ASSET="darwin-arm64"; BINARY_OK=1 ;;
esac

DOCKER_OK=0
have docker && DOCKER_OK=1

# download to stdout or file
fetch() { # fetch url [out]
  if have curl; then
    [ -n "${2:-}" ] && curl -fsSL "$1" -o "$2" || curl -fsSL "$1"
  elif have wget; then
    [ -n "${2:-}" ] && wget -qO "$2" "$1" || wget -qO- "$1"
  else
    die "need curl or wget"
  fi
}

# find the release asset url for this platform
asset_url() {
  local api="https://api.github.com/repos/${REPO}/releases"
  [ "$VERSION" = "latest" ] && api="${api}/latest" || api="${api}/tags/${VERSION}"
  fetch "$api" \
    | grep -o '"browser_download_url": *"[^"]*"' \
    | sed 's/.*"\(https[^"]*\)".*/\1/' \
    | grep -E "Kubek-.*-${ASSET}\$" \
    | head -n1
}

ready() {
  printf '\n%s\n\n' "${GRN}${B}Kubek is running:${R} ${BLU}http://localhost:${PORT}${R}"
}

install_binary() {
  local url; url="$(asset_url || true)"
  [ -n "$url" ] || die "no ${ASSET} asset in release '${VERSION}', try --docker"

  info "binary: $(basename "$url")"
  confirm "download and install to ${B}${INSTALL_DIR}${R}?" || { warn "cancelled"; exit 0; }

  mkdir -p "$INSTALL_DIR"
  fetch "$url" "${INSTALL_DIR}/kubek"
  chmod +x "${INSTALL_DIR}/kubek"
  ok "installed to ${INSTALL_DIR}/kubek"

  if [ "$RUN" = "1" ] && confirm "start it now?"; then
    ready
    cd "$INSTALL_DIR" && exec ./kubek
  fi
  ok "start with: cd ${INSTALL_DIR} && ./kubek"
}

compose_cmd() {
  docker compose version >/dev/null 2>&1 && { echo "docker compose"; return; }
  have docker-compose && { echo "docker-compose"; return; }
  echo ""
}

install_docker() {
  [ "$DOCKER_OK" = "1" ] || die "Docker is not installed (https://docs.docker.com/get-docker/)"
  local compose; compose="$(compose_cmd)"
  [ -n "$compose" ] || die "Docker Compose v2 is required"

  info "Docker setup in ${B}${INSTALL_DIR}${R} (prebuilt image ${IMAGE})"
  confirm "create the compose file and start the container?" || { warn "cancelled"; exit 0; }

  mkdir -p "$INSTALL_DIR"
  cat > "${INSTALL_DIR}/docker-compose.yml" <<YAML
services:
  kubek:
    image: ${IMAGE}
    container_name: kubek
    restart: unless-stopped
    environment:
      - PORT=${PORT}
      - TZ=UTC
    ports:
      - "${PORT}:${PORT}"
    volumes:
      - kubek-data:/data
volumes:
  kubek-data:
YAML

  if [ "$RUN" = "1" ]; then
    ( cd "$INSTALL_DIR" && $compose up -d )
    ready
    ok "logs: cd ${INSTALL_DIR} && ${compose} logs -f"
  else
    ok "start with: cd ${INSTALL_DIR} && ${compose} up -d"
  fi
}

# pick a method
printf '%s\n' "${GRN}${B}Kubek installer${R}"
[ -n "$OS" ] && [ -n "$ARCH" ] && info "system: ${OS}-${ARCH}" || warn "system: ${OS:-?}-${ARCH:-?} (no native binary)"

if [ "$MODE" = "auto" ]; then
  if [ "$BINARY_OK" = "1" ] && [ "$DOCKER_OK" = "1" ]; then
    ask "install method? ${B}binary${R} or ${B}docker${R} [binary]" "binary"
    case "$REPLY" in d*|D*) MODE="docker" ;; *) MODE="binary" ;; esac
  elif [ "$BINARY_OK" = "1" ]; then
    MODE="binary"
  elif [ "$DOCKER_OK" = "1" ]; then
    warn "no native binary for ${OS}-${ARCH}, using Docker"
    MODE="docker"
  else
    die "no native binary for this platform and Docker is not installed, install Docker or use --docker"
  fi
fi

case "$MODE" in
  binary)
    [ "$BINARY_OK" = "1" ] || die "no release binary for ${OS}-${ARCH}, use --docker"
    install_binary ;;
  docker) install_docker ;;
esac
