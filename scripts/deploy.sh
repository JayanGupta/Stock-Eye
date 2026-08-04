#!/usr/bin/env bash
# Deploy Stock-Eye from GHCR images on any Docker host.
#
# Prerequisites:
#   1. The GitHub Actions workflow (.github/workflows/cd.yml) has pushed the
#      images to GHCR (runs automatically on every push to main).
#   2. This repo is cloned on the server (migration SQL files live here).
#   3. A deploy/.env file exists with IMAGE_PREFIX, AUTH_SECRET, POSTGRES_PASSWORD.
#
# Usage:
#   IMAGE_PREFIX=ghcr.io/yourname/stock-eye \
#   AUTH_SECRET=$(openssl rand -base64 32) \
#   POSTGRES_PASSWORD=change-me \
#   ./scripts/deploy.sh

set -euo pipefail

cd "$(dirname "$0")/.."

# ── Load deploy/.env if present ───────────────────────────────────────
if [ -f deploy/.env ]; then
  set -a
  # shellcheck disable=SC1091
  source deploy/.env
  set +a
fi

COMPOSE_FILE="deploy/docker-compose.prod.yml"
: "${IMAGE_PREFIX:?Set IMAGE_PREFIX e.g. ghcr.io/yourname/stock-eye}"
: "${AUTH_SECRET:?Set AUTH_SECRET (openssl rand -base64 32)}"
: "${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD}"

DATABASE_URL="postgresql://stockeye:${POSTGRES_PASSWORD}@postgres:5432/stockeye"

echo "→ Pulling images from ${IMAGE_PREFIX} …"
docker compose -f "$COMPOSE_FILE" pull api web

echo "→ Starting postgres & redis …"
docker compose -f "$COMPOSE_FILE" up -d postgres redis
docker compose -f "$COMPOSE_FILE" up -d --wait postgres 2>/dev/null || sleep 8

echo "→ Applying database migrations …"
for dir in web/prisma/migrations/*/; do
  f="$dir/migration.sql"
  if [ -f "$f" ]; then
    echo "  - $(basename "$dir")"
    docker compose -f "$COMPOSE_FILE" exec -T postgres \
      psql -U stockeye -d stockeye -v ON_ERROR_STOP=1 < "$f"
  fi
done

echo "→ Starting api & web …"
docker compose -f "$COMPOSE_FILE" up -d --pull always api web

echo ""
echo "Deployed. Web app:  http://$(hostname -I 2>/dev/null | awk '{print $1}'):3000"
echo "Put it behind a reverse proxy (Caddy/Nginx) to serve on :443 with a domain."
