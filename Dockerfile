# syntax=docker/dockerfile:1.7

# Build stage: compile the standalone binary for the host arch (works with buildx amd64/arm64)
# Bun is pinned to the version the lockfiles were made with
FROM oven/bun:1.4.4-debian AS builder

WORKDIR /src

# Deps first (cached layer); each package has its own lockfile
COPY package.json bun.lock ./
COPY frontend/package.json frontend/bun.lock ./frontend/
COPY backend/package.json backend/bun.lock ./backend/
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile \
 && (cd frontend && bun install --frozen-lockfile) \
 && (cd backend && bun install --frozen-lockfile)

COPY . .
RUN bun run build --platform native \
 && cp dist/Kubek-*-native /kubek

# Runtime: binary is self-contained (frontend embedded), Java is downloaded on demand
FROM debian:trixie-slim AS runtime

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates \
      tzdata \
      libstdc++6 \
      curl \
      procps \
      tini \
 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /kubek /usr/local/bin/kubek
RUN chmod +x /usr/local/bin/kubek

# db.sql, servers/, backups/, binaries/java/ are written here, persist via volume
WORKDIR /data
VOLUME ["/data"]

ENV PORT=8000
EXPOSE 8000

# The panel stops native servers on SIGTERM, give it time with stop_grace_period
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-8000}/api/health" >/dev/null || exit 1

# tini reaps zombies of server processes and forwards signals to the panel
ENTRYPOINT ["/usr/bin/tini", "--", "kubek"]
