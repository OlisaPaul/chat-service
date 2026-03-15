#!/bin/sh
set -e

HOST="${MYSQL_HOST:-mysql}"
PORT="${MYSQL_PORT:-3306}"
TIMEOUT="${DB_WAIT_TIMEOUT_SECONDS:-60}"

echo "Waiting for database at ${HOST}:${PORT} ..."
node /app/scripts/wait-for-tcp.js "$HOST" "$PORT" "$TIMEOUT"

mkdir -p "${ASSETS_PATH:-/app/storage/assets}"
mkdir -p "${UPLOAD_PATH:-/app/storage/assets/chat/uploads}"

echo "Running database migrations ..."
npx typeorm migration:run -d dist/src/config/data-source.js

echo "Starting application ..."
exec node dist/main
