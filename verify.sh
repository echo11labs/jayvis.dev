#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARSER_URL="${DBML_PARSER_URL:-http://127.0.0.1:3031}"
WEB_URL="${JAYVIS_WEB_URL:-http://127.0.0.1:3000}"
PARSER_PID=""
WEB_PID=""
PARSER_LOG="$(mktemp -t jayvis-parser.XXXXXX.log)"
WEB_LOG="$(mktemp -t jayvis-web.XXXXXX.log)"

cd "$ROOT_DIR"

terminate_tree() {
  local parent_pid="$1"
  local child_pid

  while read -r child_pid; do
    if [[ -n "$child_pid" ]]; then
      terminate_tree "$child_pid"
    fi
  done < <(pgrep -P "$parent_pid" 2>/dev/null || true)

  kill "$parent_pid" 2>/dev/null || true
}

cleanup() {
  if [[ -n "$WEB_PID" ]]; then
    terminate_tree "$WEB_PID"
  fi
  if [[ -n "$PARSER_PID" ]]; then
    terminate_tree "$PARSER_PID"
  fi
}
trap cleanup EXIT INT TERM

wait_for_url() {
  local url="$1"
  local label="$2"
  local attempts=60

  for ((attempt = 1; attempt <= attempts; attempt++)); do
    if curl --fail --silent --show-error --max-time 2 "$url" >/dev/null; then
      echo "$label: ready"
      return 0
    fi
    sleep 1
  done

  echo "$label failed to become ready: $url" >&2
  return 1
}

echo "=== Static checks ==="
npm run check

echo "=== Parser service ==="
if ! curl --fail --silent --max-time 2 "$PARSER_URL/health" >/dev/null; then
  npm run start:parser >"$PARSER_LOG" 2>&1 &
  PARSER_PID=$!
fi
wait_for_url "$PARSER_URL/health" "parser"

echo "=== Web service ==="
if ! curl --fail --silent --max-time 2 "$WEB_URL" >/dev/null; then
  npm run dev:web >"$WEB_LOG" 2>&1 &
  WEB_PID=$!
fi
wait_for_url "$WEB_URL" "web"

echo "=== Parse integration ==="
PARSE_RESULT="$(
  curl --fail --silent --show-error --max-time 10 \
    -X POST "$WEB_URL/api/parse" \
    -H "Content-Type: application/json" \
    -d '{"dbml":"Table verification { id integer [pk] }"}'
)"
node -e '
  const result = JSON.parse(process.argv[1]);
  if (result.error || !result.ast?.tables?.verification) {
    console.error(result.error || "verification table missing");
    process.exit(1);
  }
  console.log("parse API: ready");
' "$PARSE_RESULT"

echo "JayVis.dev verification passed"
