#!/bin/sh
# Dijalankan setiap container `app` start: migrasi → bootstrap (idempoten) → server.
set -e

echo "[sekar] Menerapkan migrasi database…"
npx --no-install prisma migrate deploy

echo "[sekar] Memeriksa data awal (organisasi, admin, master data)…"
npx --no-install prisma db seed

exec node dist/index.js
