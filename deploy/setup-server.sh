#!/usr/bin/env bash
# One-time provisioning for a fresh Ubuntu droplet (run as root):
#   curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/main/deploy/setup-server.sh | bash
# or copy the file up and:  bash setup-server.sh
set -euo pipefail

echo "==> Updating packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

echo "==> Installing Docker (docker.com convenience script)..."
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

echo "==> Adding 2G swap (helps small droplets survive image pulls)..."
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Firewall: allow SSH/HTTP/HTTPS only..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Creating shared docker network 'edge' (Caddy <-> app instances)..."
docker network inspect edge >/dev/null 2>&1 || docker network create edge

echo "==> Creating app directory /opt/csyfinproj ..."
mkdir -p /opt/csyfinproj

cat <<'EOF'

==========================================================
Server is ready. Next steps (manual):

1. Put the environment file in place:
     cd /opt/csyfinproj
     # paste the contents of deploy/.env.example and fill it in:
     nano .env

2. Add the GitHub Actions deploy key:
     - create a key pair:   ssh-keygen -t ed25519 -f deploy_key -C csyfinproj-deploy
     - append deploy_key.pub to ~/.ssh/authorized_keys of the deploy user
     - put the PRIVATE key into the repo secret DEPLOY_SSH_KEY

3. Push to main (or run the workflow manually) — GitHub Actions
   will copy docker-compose.yml + Caddyfile here, pull images,
   sync the database schema and start the stack.
==========================================================
EOF
