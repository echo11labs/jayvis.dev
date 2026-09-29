#!/usr/bin/env bash
# Pull the latest GitHub deploy release and activate it. Safe to run every
# minute: it exits immediately when that release is already live.
set -euo pipefail

REPO=echo11labs/jayvis.dev
STATE="$HOME/.jayvis-deployed-sha"
STAGE="$HOME/jayvis-next"
LOCK="$HOME/.jayvis-deploy.lock"

exec 9>"$LOCK"
if ! flock -n 9; then
  exit 0
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
code="$(curl -sS -o "$tmp" -w '%{http_code}' \
  -H "Accept: application/vnd.github+json" \
  -H "User-Agent: jayvis-vm" \
  "https://api.github.com/repos/${REPO}/releases/latest")"
if [[ "$code" != "200" ]]; then
  exit 0
fi

set +e
meta="$(node --input-type=module -e '
import fs from "node:fs";
const rel = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const asset = (rel.assets || []).find((item) => item.name === "jayvis-release.tar.gz");
if (!rel.tag_name?.startsWith("deploy-") || !asset) process.exit(2);
process.stdout.write(rel.tag_name.slice("deploy-".length) + "\n" + asset.browser_download_url + "\n");
' "$tmp")"
node_code=$?
set -e
if [[ "$node_code" -eq 2 ]]; then
  exit 0
fi
if [[ "$node_code" -ne 0 ]]; then
  exit "$node_code"
fi

sha="$(printf '%s\n' "$meta" | sed -n '1p')"
url="$(printf '%s\n' "$meta" | sed -n '2p')"
if [[ -z "$sha" || -z "$url" ]]; then
  exit 0
fi
if [[ -f "$STATE" && "$(cat "$STATE")" == "$sha" ]]; then
  exit 0
fi

rm -rf "$STAGE"
mkdir -p "$STAGE"
archive="$(mktemp)"
curl -fL --retry 3 -o "$archive" "$url"
tar -xzf "$archive" -C "$STAGE"
rm -f "$archive"
bash "$STAGE/scripts/vm-deploy.sh"
printf '%s\n' "$sha" >"$STATE"
echo "deployed $sha"
