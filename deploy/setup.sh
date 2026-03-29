#!/usr/bin/env bash
set -euo pipefail

# One-time droplet setup for shogol.me
# Run as root on a fresh Ubuntu 24.04 droplet

echo "==> Updating system"
apt update && apt upgrade -y

echo "==> Installing Docker"
apt install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "==> Creating deploy user"
if ! id deploy &>/dev/null; then
    adduser --disabled-password --gecos "" deploy
    usermod -aG docker deploy
    mkdir -p /home/deploy/.ssh
    cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
    chown -R deploy:deploy /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    chmod 600 /home/deploy/.ssh/authorized_keys
fi

echo "==> Configuring firewall"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Cloning repo"
if [ ! -d /opt/shogol ]; then
    read -rp "Git repo URL: " REPO_URL
    git clone "$REPO_URL" /opt/shogol
    chown -R deploy:deploy /opt/shogol
fi

echo "==> Creating .env"
if [ ! -f /opt/shogol/.env ]; then
    cp /opt/shogol/.env.example /opt/shogol/.env
    echo "IMPORTANT: Edit /opt/shogol/.env with your DATABASE_URL (use private network hostname)"
    echo "Then run: su - deploy -c 'cd /opt/shogol && docker compose up -d'"
fi

echo "==> Installing systemd service"
cp /opt/shogol/deploy/shogol.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable shogol

echo "==> Installing DigitalOcean monitoring agent"
apt install -y do-agent || true

echo ""
echo "Setup complete. Next steps:"
echo "  1. Edit /opt/shogol/.env with your Postgres connection string"
echo "  2. systemctl start shogol"
echo "  3. curl http://localhost/healthz"
