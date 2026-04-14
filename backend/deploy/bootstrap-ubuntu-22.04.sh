#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="/opt/romantic-collection"
BACKEND_DIR="$PROJECT_ROOT/backend"
NODE_MAJOR="20"

if [[ "${EUID}" -ne 0 ]]; then
  echo "[ERROR] Please run as root: sudo bash backend/deploy/bootstrap-ubuntu-22.04.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "[1/7] apt update"
apt-get update

echo "[2/7] install base packages"
apt-get install -y ca-certificates curl gnupg git nginx mysql-server

echo "[3/7] install Node.js ${NODE_MAJOR}.x"
mkdir -p /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/nodesource.gpg ]]; then
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
fi
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
apt-get update
apt-get install -y nodejs

echo "[4/7] install pm2"
npm install -g pm2

echo "[5/7] enable services"
systemctl enable nginx
systemctl enable mysql
systemctl restart nginx
systemctl restart mysql

echo "[6/7] create project directory"
mkdir -p "$PROJECT_ROOT"

cat <<EOF
[7/7] bootstrap complete
- Project root: $PROJECT_ROOT
- Backend dir:  $BACKEND_DIR

Next steps:
1. git clone <repo-url> $PROJECT_ROOT
2. cd $BACKEND_DIR
3. cp .env.example .env
4. fill APP_SECRET / JWT_SECRET / DATABASE_URL
5. mysql -uroot -p < sql/init.sql
6. npm install && npm run prisma:generate
7. pm2 start ecosystem.config.js && pm2 save
EOF
