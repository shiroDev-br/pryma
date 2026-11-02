#!/usr/bin/env bash
# Deploy do front na VPS: build local (cópia limpa) → rsync do .output → troca atômica.
#
#   scripts/deploy-vps.sh             # recusa se houver alterações não commitadas
#   ALLOW_DIRTY=1 scripts/deploy-vps.sh
#   scripts/deploy-vps.sh --rollback  # volta para o build anterior
#
# Variáveis: VPS (root@187.127.38.71), REMOTE_DIR (/opt/iptv-front),
#            PUBLIC_API_BASE_URL (http://187.127.38.71:8001).
set -euo pipefail

VPS="${VPS:-root@187.127.38.71}"
REMOTE_DIR="${REMOTE_DIR:-/opt/iptv-front}"
API_URL="${PUBLIC_API_BASE_URL:-http://187.127.38.71:8001}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE="docker compose -f $REMOTE_DIR/docker-compose.yml"

wait_healthy() {
  ssh "$VPS" "for i in \$(seq 1 30); do s=\$(docker inspect -f '{{.State.Health.Status}}' iptv-front 2>/dev/null); [ \"\$s\" = healthy ] && echo healthy && exit 0; sleep 2; done; echo \"unhealthy: \$s\"; docker logs --tail 30 iptv-front; exit 1"
}

if [ "${1:-}" = "--rollback" ]; then
  echo "→ rollback para .output.prev"
  ssh "$VPS" "set -e; cd $REMOTE_DIR; test -d .output.prev; mv .output .output.failed; mv .output.prev .output; rm -rf .output.failed; $COMPOSE up -d --force-recreate front"
  wait_healthy
  exit 0
fi

cd "$ROOT"
if [ -n "$(git status --porcelain)" ] && [ "${ALLOW_DIRTY:-0}" != "1" ]; then
  echo "✗ Há alterações não commitadas — o deploy publicaria a árvore de trabalho como está."
  echo "  Commit antes, ou rode com ALLOW_DIRTY=1 se for intencional."
  exit 1
fi

SHA="$(git rev-parse --short HEAD)"
[ -n "$(git status --porcelain)" ] && SHA="$SHA-dirty"
BUILD_ID="$SHA-$(date -u +%Y%m%d%H%M)"

# Cópia limpa: não disputa o .nuxt com um `nuxt dev` rodando e não leva
# android/, zips nem builds antigos. node_modules entra por symlink.
BUILD_DIR="$(mktemp -d -t iptv-front-build)"
trap 'rm -rf "$BUILD_DIR"' EXIT
echo "→ build $BUILD_ID em $BUILD_DIR"
rsync -a \
  --exclude node_modules --exclude .nuxt --exclude .output --exclude dist \
  --exclude android --exclude .git --exclude .data --exclude '*.zip' \
  ./ "$BUILD_DIR/"
ln -s "$ROOT/node_modules" "$BUILD_DIR/node_modules"
(
  cd "$BUILD_DIR"
  DATA_MODE=live PUBLIC_API_BASE_URL="$API_URL" API_BASE_URL="$API_URL" BUILD_ID="$BUILD_ID" \
    npx nuxt build
)

echo "→ enviando para $VPS:$REMOTE_DIR"
ssh "$VPS" "mkdir -p $REMOTE_DIR"
rsync -az deploy/docker-compose.yml "$VPS:$REMOTE_DIR/docker-compose.yml"
rsync -az --delete "$BUILD_DIR/.output/" "$VPS:$REMOTE_DIR/.output.next/"

echo "→ trocando build e reiniciando"
ssh "$VPS" "set -e; cd $REMOTE_DIR; rm -rf .output.prev; if [ -d .output ]; then mv .output .output.prev; fi; mv .output.next .output; $COMPOSE up -d --force-recreate front"
wait_healthy
echo "✓ front no ar: http://${VPS#*@}:3000 (build $BUILD_ID)"
