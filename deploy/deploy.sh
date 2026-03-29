#!/usr/bin/env bash
set -euo pipefail

cd /opt/shogol

echo "==> Pulling latest"
git pull origin main

echo "==> Building and restarting"
docker compose up --build -d

echo "==> Cleaning old images"
docker image prune -f

echo "==> Health check"
sleep 2
if curl -sf http://localhost/healthz > /dev/null; then
    echo "Deploy successful"
else
    echo "DEPLOY FAILED - health check failed"
    docker compose logs --tail 20
    exit 1
fi
