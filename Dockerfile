# syntax=docker/dockerfile:1

# Build stage: compile the standalone binary for the host arch (works with buildx amd64/arm64)
FROM oven/bun:debian AS builder

WORKDIR /src

# Deps first (cached layer); each package has its own lockfile
COPY package.json bun.lock ./
COPY frontend/package.json frontend/bun.lock ./frontend/
COPY backend/package.json backend/bun.lock ./backend/
RUN bun install --frozen-lockfile \
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
 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /kubek /usr/local/bin/kubek
RUN chmod +x /usr/local/bin/kubek

# db.sql, servers/, backups/, binaries/java/ are written here, persist via volume
WORKDIR /data
VOLUME ["/data"]

ENV PORT=8000
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-8000}/" >/dev/null || exit 1

ENTRYPOINT ["kubek"]
