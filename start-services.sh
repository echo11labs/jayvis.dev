#!/bin/bash
# JayVis.dev — starts all background services and keeps them alive.
# Each service is fully detached with setsid + nohup so it survives
# the parent shell exiting.

cd /home/z/my-project

# Kill any leftovers.
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "next dev" 2>/dev/null
pkill -9 -f "bun.*dbml-parser/index" 2>/dev/null
sleep 2

# 1) DBML parser mini-service (port 3031)
nohup setsid bun --hot /home/z/my-project/mini-services/dbml-parser/index.ts \
  > /home/z/my-project/mini-services/dbml-parser/service.log 2>&1 < /dev/null &
disown
echo "dbml-parser pid $!"

# 2) Next.js dev server (port 3000)
nohup setsid bun run next dev -p 3000 \
  > /home/z/my-project/dev.log 2>&1 < /dev/null &
disown
echo "next dev pid $!"

# Give them time to boot.
sleep 4

echo "--- mini-service health ---"
curl -s -o /dev/null -w "3031/health HTTP %{http_code}\n" --max-time 8 http://127.0.0.1:3031/health || echo "3031 down"

echo "--- next page ---"
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 http://127.0.0.1:3000/ 2>/dev/null)
  if [ "$code" = "200" ]; then echo "3000/ HTTP 200 (iter $i)"; break; fi
  if ! pgrep -f "next-server" >/dev/null 2>&1; then echo "3000 died at iter $i"; break; fi
  sleep 2
done
