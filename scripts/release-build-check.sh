#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
export DATABASE_URL="file:${tmp}/dev.db"
cd "$root"
npx prisma migrate deploy
npx tsx --experimental-sqlite scripts/release-build-check.ts
