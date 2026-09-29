#!/usr/bin/env bash
# Activate a staged release on the VM. GitHub Actions rsyncs the built app
# to ~/jayvis-next first. This script installs dependencies, migrates, swaps
# the live directory, and rolls back if the site does not answer.
set -euo pipefail

APP=/home/echo11_labs/jayvis.dev
STAGE=/home/echo11_labs/jayvis-next
PREV=/home/echo11_labs/jayvis-prev

if [[ ! -f "$STAGE/package.json" ]]; then
  echo "staging directory is missing package.json" >&2
  exit 1
fi

if [[ ! -f /swapfile ]]; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
fi
sudo swapon /swapfile 2>/dev/null || true
if ! grep -q '^/swapfile[[:space:]]' /etc/fstab; then
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

sudo mkdir -p /var/lib/jayvis
sudo chown echo11_labs:echo11_labs /var/lib/jayvis

avail_kb="$(df -Pk /home/echo11_labs | awk 'NR==2 {print $4}')"
if [[ "$avail_kb" -lt 2500000 ]]; then
  echo "need 2.5GB free on the VM before install, have ${avail_kb}KB" >&2
  exit 1
fi

if [[ -f "$APP/.env" ]]; then
  cp "$APP/.env" "$STAGE/.env"
else
  cat >"$STAGE/.env" <<'EOF'
DATABASE_URL=file:/var/lib/jayvis/dev.db
DBML_PARSER_URL=http://127.0.0.1:3031
DBML_PARSER_TIMEOUT_MS=5000
EOF
fi

cd "$STAGE"
npm ci --include=dev
npx prisma generate

set +e
migrate_out="$(npx prisma migrate deploy 2>&1)"
migrate_code=$?
set -e
if [[ "$migrate_code" -ne 0 ]]; then
  printf '%s\n' "$migrate_out"
  if printf '%s\n' "$migrate_out" | grep -q 'P3005'; then
    npx prisma db execute --file prisma/migrations/20260928160000_init/migration.sql --schema prisma/schema.prisma
    npx prisma migrate resolve --applied 20260928160000_init
  else
    exit "$migrate_code"
  fi
else
  printf '%s\n' "$migrate_out"
fi

sudo tee /etc/systemd/system/jayvis.service >/dev/null <<'EOF'
[Unit]
Description=JayVis
After=network.target

[Service]
Type=simple
User=echo11_labs
WorkingDirectory=/home/echo11_labs/jayvis.dev
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable jayvis

rm -rf "$PREV"
if [[ -d "$APP" ]]; then
  mv "$APP" "$PREV"
fi
mv "$STAGE" "$APP"

sudo systemctl restart jayvis

ok=0
for _ in $(seq 1 30); do
  if curl -sf -m 3 http://127.0.0.1:3000/ >/dev/null; then
    ok=1
    break
  fi
  sleep 2
done

if [[ "$ok" -ne 1 ]]; then
  echo "health check failed, rolling back" >&2
  sudo journalctl -u jayvis -n 80 --no-pager || true
  if [[ -d "$PREV" ]]; then
    rm -rf "$APP"
    mv "$PREV" "$APP"
    sudo systemctl restart jayvis || true
  fi
  exit 1
fi

rm -rf "$PREV"
echo "deploy ok"
