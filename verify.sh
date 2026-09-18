#!/bin/bash
# StitchDB — full startup + verification in one shot so background
# processes stay alive during the browser test.
set -e
cd /home/z/my-project

echo "=== 1. Kill leftovers ==="
pkill -9 -f "next-server" 2>/dev/null || true
pkill -9 -f "next dev" 2>/dev/null || true
pkill -9 -f "dbml-parser/index" 2>/dev/null || true
sleep 2

echo "=== 2. Start mini-service (port 3031) ==="
nohup setsid bun /home/z/my-project/mini-services/dbml-parser/index.ts \
  > /home/z/my-project/mini-services/dbml-parser/service.log 2>&1 < /dev/null &
disown
sleep 3
curl -s -o /dev/null -w "mini health HTTP %{http_code}\n" --max-time 8 http://127.0.0.1:3031/health

echo "=== 3. Start Next dev server (port 3000) ==="
nohup setsid bun run next dev -p 3000 > /home/z/my-project/dev.log 2>&1 < /dev/null &
disown
sleep 6

echo "=== 4. Pre-warm page + chunks + parse API ==="
curl -s -o /dev/null -w "page HTTP %{http_code} %{time_total}s\n" --max-time 60 http://127.0.0.1:3000/
curl -s --max-time 20 http://127.0.0.1:3000/ | grep -o '/_next/static/chunks/[^"]*\.js' | sort -u | while read c; do
  curl -s -o /dev/null --max-time 20 "http://127.0.0.1:3000$c"
done
echo "  chunks pre-warmed"
curl -s -o /dev/null -w "parse-api HTTP %{http_code}\n" --max-time 20 \
  -X POST http://127.0.0.1:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{"dbml":"Table t { id integer [pk] }"}'

echo "=== 5. Services alive check ==="
pgrep -f "next-server" >/dev/null && echo "  next: ALIVE" || echo "  next: DEAD"
pgrep -f "dbml-parser" >/dev/null && echo "  mini: ALIVE" || echo "  mini: DEAD"

echo "=== 6. Browser: block HMR, load via gateway ==="
agent-browser network route "**/_next/webpack-hmr*" --abort 2>&1 | tail -1
agent-browser console --clear >/dev/null 2>&1
agent-browser open "http://127.0.0.1:81/" >/dev/null 2>&1
sleep 8

echo "=== 7. Post-load checks ==="
pgrep -f "next-server" >/dev/null && echo "  next: ALIVE" || echo "  next: DEAD"
pgrep -f "dbml-parser" >/dev/null && echo "  mini: ALIVE" || echo "  mini: DEAD"

echo "=== 8. Page state ==="
agent-browser eval "(function(){var ta=document.querySelector('textarea');var rf=document.querySelectorAll('.react-flow__node').length;var stats=document.body.innerText.match(/tables[^\d]*(\d+)/);return 'editor-len:'+(ta?.value?.length||0)+' rf-nodes:'+rf+' tables:'+(stats?stats[1]:'?')})()" 2>&1 | tail -1

echo "=== 9. Dev log tail ==="
tail -6 /home/z/my-project/dev.log
