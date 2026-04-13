#!/bin/sh
set -e

HOST="${MYSQL_HOST:-mysql}"
DB_PORT="${MYSQL_PORT:-3306}"
TIMEOUT="${DB_WAIT_TIMEOUT_SECONDS:-60}"
APP_PORT="${PORT:-3001}"

echo "Waiting for database at ${HOST}:${DB_PORT} (timeout: ${TIMEOUT}s) ..."
node /app/scripts/wait-for-tcp.js "$HOST" "$DB_PORT" "$TIMEOUT"

mkdir -p "${ASSETS_PATH:-/app/storage/assets}"
mkdir -p "${UPLOAD_PATH:-/app/storage/assets/chat/uploads}"

echo "Ensured asset paths:"
echo "  ASSETS_PATH=${ASSETS_PATH:-/app/storage/assets}"
echo "  UPLOAD_PATH=${UPLOAD_PATH:-/app/storage/assets/chat/uploads}"

echo "Running database migrations ..."
npx typeorm migration:run -d dist/src/config/data-source.js
echo "Database migrations completed."

echo "Starting application on port ${APP_PORT} ..."
exec node dist/src/main.js
