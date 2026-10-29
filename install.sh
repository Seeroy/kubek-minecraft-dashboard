#!/usr/bin/env bash
#
# Kubek installer
#   curl -fsSL https://raw.githubusercontent.com/Seeroy/kubek-minecraft-dashboard/main/install.sh | bash
#
# Detects your system, then installs Kubek as a native binary or via Docker.
# If both are possible it asks which one you want. Running it again over an
# existing install updates it.
#
# Options:
#   --docker          Use Docker Compose
#   --binary          Use the native binary
#   --dir <path>      Install directory (default: ./kubek)
#   --version <tag>   Release tag, e.g. v4.0.0 (default: latest)
#   --update          Update an existing install in --dir
#   --systemd         Install a systemd service (binary mode, Linux)
#   --no-run          Install but don't start
#   -y, --yes         Don't ask, use defaults
#   -h, --help        Show this help
#
set -euo pipefail

REPO="Seeroy/kubek-minecraft-dashboard"
IMAGE_REPO="seeroy/kubek-minecraft-dashboard"
DEFAULT_DIR="./kubek"
PORT="${PORT:-8000}"
SERVICE="kubek"

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
  --update          Update an existing install in --dir
  --systemd         Install a systemd service (binary mode, Linux)
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

confirm() { # confirm "question"; returns 0 for yes, default yes
  ask "$1 [Y/n]" "y"
  case "$REPLY" in [Nn]*) return 1 ;; *) return 0 ;; esac
}

confirm_no() { # confirm_no "question"; returns 0 for yes, default no
  ask "$1 [y/N]" "n"
  case "$REPLY" in [Yy]*) return 0 ;; *) return 1 ;; esac
}

# args
MODE="auto"
INSTALL_DIR="$DEFAULT_DIR"
VERSION="latest"
RUN=1
YES=0
UPDATE=0
SYSTEMD=0
TMP_DL=""

while [ $# -gt 0 ]; do
  case "$1" in
    --docker)  MODE="docker" ;;
    --binary)  MODE="binary" ;;
    --dir)     INSTALL_DIR="${2:?--dir needs a path}"; shift ;;
    --version) VERSION="${2:?--version needs a tag}"; shift ;;
    --update)  UPDATE=1 ;;
    --systemd) SYSTEMD=1 ;;
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
  linux-x64)
    ASSET="linux-x64"; BINARY_OK=1
    # CPUs without AVX2 need the baseline build
    if [ -r /proc/cpuinfo ] && ! grep -qw avx2 /proc/cpuinfo; then
      ASSET="linux-x64-baseline"
    fi
    ;;
  linux-arm64)  ASSET="linux-arm64"; BINARY_OK=1 ;;
  darwin-arm64) ASSET="darwin-arm64"; BINARY_OK=1 ;;
esac

DOCKER_OK=0
have docker && DOCKER_OK=1

UNIT_FILE="/etc/systemd/system/${SERVICE}.service"

# panel data: 4.x database or a 3.x servers list
has_data() { [ -f "$1/db.sql" ] || [ -f "$1/servers/servers.json" ]; }

# a release binary started by hand, as the README shows
manual_binary() {
  local f
  for f in "$1"/Kubek-*; do
    [ -f "$f" ] && { printf '%s\n' "$f"; return; }
  done
  return 0
}

detect_existing() { # detect_existing dir; prints binary, docker or nothing
  if [ -f "$1/docker-compose.yml" ]; then echo "docker"
  elif [ -f "$1/kubek" ] || [ -n "$(manual_binary "$1")" ] || has_data "$1"; then echo "binary"
  fi
  return 0
}

abs_dir() { (cd "$1" 2>/dev/null && pwd -P); }

unit_value() { # unit_value Key; value from the installed unit
  [ -f "$UNIT_FILE" ] && sed -n "s/^$1=//p" "$UNIT_FILE" | head -n1
  return 0
}

# existing install in the target dir
EXISTING="$(detect_existing "$INSTALL_DIR")"

if [ "$UPDATE" = "1" ] && [ -z "$EXISTING" ]; then
  die "nothing to update in ${INSTALL_DIR}, run without --update to install"
fi

# download to stdout or file
fetch() { # fetch url [out]
  if have curl; then
    if [ -n "${2:-}" ]; then curl -fsSL "$1" -o "$2"; else curl -fsSL "$1"; fi
  elif have wget; then
    if [ -n "${2:-}" ]; then wget -qO "$2" "$1"; else wget -qO- "$1"; fi
  else
    die "need curl or wget"
  fi
}

# download urls of the release assets, one per line, fetched once
RELEASE_URLS=""
load_release() {
  local api="https://api.github.com/repos/${REPO}/releases"
  if [ "$VERSION" = "latest" ]; then api="${api}/latest"; else api="${api}/tags/${VERSION}"; fi
  RELEASE_URLS="$(fetch "$api" \
    | grep -o '"browser_download_url": *"[^"]*"' \
    | sed 's/.*"\(https[^"]*\)".*/\1/' || true)"
}

# find the release asset url for this platform
asset_url() {
  printf '%s\n' "$RELEASE_URLS" | grep -E "/Kubek-[^/]*-${1}\$" | head -n1 || true
}

sums_url() {
  printf '%s\n' "$RELEASE_URLS" | grep -E '/SHA256SUMS$' | head -n1 || true
}

sha256_of() {
  if have sha256sum; then sha256sum "$1" | awk '{print $1}'
  elif have shasum; then shasum -a 256 "$1" | awk '{print $1}'
  else echo ""
  fi
}

# verify file against SHA256SUMS of the release, warn when the release has none
verify_sha256() { # verify_sha256 file asset_name
  local url sums expected actual
  url="$(sums_url)"
  if [ -z "$url" ]; then
    warn "release has no SHA256SUMS, skipping checksum check"
    return 0
  fi
  sums="$(fetch "$url")" || die "could not download SHA256SUMS"
  expected="$(printf '%s\n' "$sums" | awk -v f="$2" '{n=$2; sub(/^\*/, "", n); if (n == f) print tolower($1)}' | head -n1)"
  [ -n "$expected" ] || die "$2 is not listed in SHA256SUMS"
  actual="$(sha256_of "$1")"
  if [ -z "$actual" ]; then
    warn "no sha256sum or shasum found, skipping checksum check"
    return 0
  fi
  [ "$actual" = "$expected" ] || die "checksum mismatch for $2, download is corrupt or tampered"
  ok "checksum verified"
}

ready() {
  printf '\n%s\n\n' "${GRN}${B}Kubek is running:${R} ${BLU}http://localhost:${PORT}${R}"
}

as_root() {
  if [ "$(id -u)" = "0" ]; then "$@"
  elif have sudo; then sudo "$@"
  else die "need root or sudo for: $*"
  fi
}

service_installed() {
  have systemctl && [ -f "$UNIT_FILE" ]
}

# the service user must own the data, root owned db.sql opens read-only
fix_owner() { # fix_owner dir user
  local dir="$1" user="${2:-root}"
  [ "$user" = "root" ] && return 0
  [ -n "$(find "$dir" ! -user "$user" -print -quit 2>/dev/null)" ] || return 0
  warn "some files in ${dir} are not owned by ${user}, the service can't write to them"
  if confirm "run ${B}chown -R ${user}: ${dir}${R}?"; then
    as_root chown -R "${user}:" "$dir"
    ok "${dir} is owned by ${user}"
  else
    warn "Kubek may fail to start, fix it with: sudo chown -R ${user}: ${dir}"
  fi
}

install_service() { # install_service abs_dir
  local dir="$1" user
  user="$(id -un)"
  [ "$user" = "root" ] && [ -n "${SUDO_USER:-}" ] && user="$SUDO_USER"
  info "writing ${UNIT_FILE} (User=${user})"
  as_root tee "$UNIT_FILE" >/dev/null <<UNIT
[Unit]
Description=Kubek, Minecraft server panel
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
User=${user}
WorkingDirectory=${dir}
ExecStart=${dir}/kubek
Environment=PORT=${PORT}
Restart=on-failure
RestartSec=5
# SIGTERM goes to the panel only, it stops the servers itself before the timeout
KillMode=mixed
TimeoutStopSec=120

[Install]
WantedBy=multi-user.target
UNIT
  as_root systemctl daemon-reload
  as_root systemctl enable "$SERVICE" >/dev/null
  ok "service ${SERVICE} installed"
}

install_binary() {
  [ -n "$ASSET" ] || die "no release binary for ${OS}-${ARCH}, use --docker"
  local url name
  load_release
  url="$(asset_url "$ASSET")"
  if [ -z "$url" ] && [ "$ASSET" = "linux-x64-baseline" ]; then
    warn "no baseline build in this release, using linux-x64 (needs AVX2)"
    ASSET="linux-x64"; url="$(asset_url "$ASSET")"
  fi
  [ -n "$url" ] || die "no ${ASSET} asset in release '${VERSION}', try --docker"
  name="$(basename "$url")"

  info "binary: ${name}"
  if [ "$EXISTING" = "binary" ]; then
    confirm "update ${B}${INSTALL_DIR}/kubek${R} to ${name}?" || { warn "cancelled"; exit 0; }
  else
    confirm "download and install to ${B}${INSTALL_DIR}${R}?" || { warn "cancelled"; exit 0; }
  fi

  mkdir -p "$INSTALL_DIR"
  INSTALL_DIR="$(cd "$INSTALL_DIR" && pwd)"
  local had_kubek=0 old_bin
  [ -f "${INSTALL_DIR}/kubek" ] && had_kubek=1
  old_bin="$(manual_binary "$INSTALL_DIR")"

  # Download next to the target and rename, a running binary can't be overwritten in place
  TMP_DL="${INSTALL_DIR}/.kubek.download.$$"
  trap 'rm -f "$TMP_DL"' EXIT
  fetch "$url" "$TMP_DL" || die "download failed: $url"
  verify_sha256 "$TMP_DL" "$name"
  chmod +x "$TMP_DL"
  mv -f "$TMP_DL" "${INSTALL_DIR}/kubek"
  trap - EXIT
  ok "installed to ${INSTALL_DIR}/kubek"
  if [ -n "$old_bin" ]; then
    warn "Kubek now runs as ${B}${INSTALL_DIR}/kubek${R}, ${old_bin} is the old version"
    warn "stop the old one and start ./kubek instead, data in this folder is picked up as is"
  fi

  # systemd only on Linux, optional
  local use_service=0 service_dir
  service_dir="$(unit_value WorkingDirectory)"
  if service_installed && [ "$(abs_dir "$service_dir" || true)" != "$(abs_dir "$INSTALL_DIR")" ]; then
    warn "the ${SERVICE} service runs ${service_dir}, not ${INSTALL_DIR}, leaving it alone"
  elif service_installed; then
    use_service=1
  elif [ "$OS" = "linux" ] && have systemctl && [ -d /run/systemd/system ]; then
    if [ "$SYSTEMD" = "1" ] || confirm_no "install a systemd service so Kubek starts on boot?"; then
      install_service "$INSTALL_DIR"
      use_service=1
    fi
  elif [ "$SYSTEMD" = "1" ]; then
    warn "systemd is not available here, skipping the service"
  fi

  if [ "$use_service" = "1" ]; then
    fix_owner "$INSTALL_DIR" "$(unit_value User)"
    if [ "$RUN" = "1" ]; then
      as_root systemctl restart "$SERVICE"
      ready
      ok "logs: journalctl -u ${SERVICE} -f"
    else
      ok "start with: sudo systemctl start ${SERVICE}"
    fi
    return
  fi

  if [ "$had_kubek" = "1" ] || [ -n "$old_bin" ]; then
    ok "restart Kubek to run the new version"
    return
  fi
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

write_compose() { # write_compose file image
  cat > "$1" <<YAML
services:
  kubek:
    image: $2
    container_name: kubek
    restart: unless-stopped
    # tini in the image is PID 1, the panel stops servers on SIGTERM
    stop_grace_period: 90s
    environment:
      - PORT=${PORT}
      - TZ=UTC
    ports:
      - "${PORT}:${PORT}"
    volumes:
      - kubek-data:/data
    logging:
      driver: json-file
      options:
        max-size: "20m"
        max-file: "5"
volumes:
  kubek-data:
YAML
}

# seconds from stop_grace_period, 90 when missing or not plain s/m
grace_seconds() { # grace_seconds file
  local v
  v="$(sed -n 's/^[[:space:]]*stop_grace_period:[[:space:]]*\([0-9][0-9]*[sm]\{0,1\}\)[[:space:]]*$/\1/p' "$1" | head -n1)"
  case "$v" in
    *m) echo $(( ${v%m} * 60 )) ;;
    *s) echo "${v%s}" ;;
    "") echo 90 ;;
    *) echo "$v" ;;
  esac
}

# old compose files have no grace period, docker kills the servers after 10s
ensure_grace_period() { # ensure_grace_period file
  local file="$1" line="    stop_grace_period: 90s"
  grep -q 'stop_grace_period:' "$file" && return 0
  # only touch the layout this script writes, a single kubek service
  if grep -q '^  kubek:[[:space:]]*$' "$file" \
    && [ "$(grep -c '^    restart:' "$file")" = "1" ] \
    && [ "$(grep -Ec '^    (image|build):' "$file")" = "1" ]; then
    cp "$file" "${file}.bak"
    awk -v l="$line" '{ print } /^    restart:/ { print l }' "${file}.bak" > "$file"
    ok "added stop_grace_period: 90s to ${file} (backup in ${file}.bak)"
  else
    warn "${file} has no stop_grace_period, servers get killed after 10s on stop"
    warn "add this under the kubek service: ${B}stop_grace_period: 90s${R}"
  fi
}

install_docker() {
  [ "$DOCKER_OK" = "1" ] || die "Docker is not installed (https://docs.docker.com/get-docker/)"
  local compose; compose="$(compose_cmd)"
  [ -n "$compose" ] || die "Docker Compose v2 is required"

  # image tags are the version without the leading v
  local tag="latest"
  [ "$VERSION" = "latest" ] || tag="${VERSION#v}"
  local image="${IMAGE_REPO}:${tag}"
  local file="${INSTALL_DIR}/docker-compose.yml"

  info "Docker setup in ${B}${INSTALL_DIR}${R} (prebuilt image ${image})"
  local upgrade=0
  if [ -f "$file" ]; then
    upgrade=1
    if confirm_no "overwrite the existing ${file}?"; then
      write_compose "$file" "$image"
      ok "compose file written"
    else
      info "keeping the existing compose file"
      [ "$VERSION" = "latest" ] || warn "--version is ignored, the image tag in ${file} is used"
      ensure_grace_period "$file"
    fi
  else
    confirm "create the compose file and start the container?" || { warn "cancelled"; exit 0; }
    mkdir -p "$INSTALL_DIR"
    write_compose "$file" "$image"
  fi

  if [ "$RUN" = "1" ]; then
    local grace; grace="$(grace_seconds "$file")"
    (
      cd "$INSTALL_DIR"
      # get the new image ready first so servers stay up meanwhile
      if grep -Eq '^[[:space:]]*build:' "$file"; then
        $compose build --pull
      else
        $compose pull || warn "pull failed, starting with local images"
      fi
      # the panel needs time to stop its servers, else they get SIGKILL
      if [ "$upgrade" = "1" ]; then
        info "stopping the old container (up to ${grace}s while servers save)"
        $compose stop -t "$grace"
      fi
      $compose up -d
    )
    ready
    ok "logs: cd ${INSTALL_DIR} && ${compose} logs -f"
  else
    ok "start with: cd ${INSTALL_DIR} && ${compose} up -d"
  fi
}

# pick a method
printf '%s\n' "${GRN}${B}Kubek installer${R}"
if [ -n "$OS" ] && [ -n "$ARCH" ]; then
  info "system: ${OS}-${ARCH}"
else
  warn "system: ${OS:-?}-${ARCH:-?} (no native binary)"
fi

if [ "$MODE" = "auto" ] && [ -n "$EXISTING" ]; then
  info "found an existing ${EXISTING} install in ${INSTALL_DIR}, updating it"
  MODE="$EXISTING"
fi

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
