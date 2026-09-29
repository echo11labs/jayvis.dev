#!/usr/bin/env bash
# One-time VM setup: install the release watcher and run it once.
set -euo pipefail

curl -fsSL -o "$HOME/jayvis-watch.sh" \
  https://raw.githubusercontent.com/echo11labs/jayvis.dev/main/scripts/vm-watch.sh
chmod +x "$HOME/jayvis-watch.sh"

sudo tee /etc/systemd/system/jayvis-watch.service >/dev/null <<'EOF'
[Unit]
Description=Pull and activate a JayVis release
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=echo11_labs
ExecStart=/home/echo11_labs/jayvis-watch.sh
EOF

sudo tee /etc/systemd/system/jayvis-watch.timer >/dev/null <<'EOF'
[Unit]
Description=Check GitHub for a new JayVis release

[Timer]
OnBootSec=45
OnUnitActiveSec=60
AccuracySec=10
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now jayvis-watch.timer
"$HOME/jayvis-watch.sh" || true
echo "watcher installed"
