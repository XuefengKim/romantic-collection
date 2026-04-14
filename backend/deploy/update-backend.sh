#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="/opt/romantic-collection"
BACKEND_DIR="$PROJECT_ROOT/backend"
BRANCH="${1:-main}"

if [[ ! -d "$PROJECT_ROOT/.git" ]]; then
  echo "[ERROR] Git repository not found at $PROJECT_ROOT"
  exit 1
fi

cd "$PROJECT_ROOT"

echo "[1/6] fetch latest code"
git fetch origin

echo "[2/6] checkout $BRANCH"
git checkout "$BRANCH"

echo "[3/6] pull latest code"
git pull origin "$BRANCH"

echo "[4/6] install backend dependencies"
cd "$BACKEND_DIR"
npm install

echo "[5/6] generate Prisma client"
npm run prisma:generate

echo "[6/6] restart pm2 service"
pm2 start ecosystem.config.js --only romantic-backend || pm2 restart romantic-backend
pm2 save

echo "[DONE] backend updated successfully"
