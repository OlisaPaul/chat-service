# Deployment and Self-Hosting

This project is a self-hostable NestJS communication backend with a built-in reference client.

## Minimum Supported Stack

- Node.js 22+
- MySQL 8+
- writable filesystem path for uploaded assets

Optional for remote WebRTC testing:

- STUN server
- TURN server for broader real-world connectivity

## Local or VM Deployment

1. Copy [`.env.example`](C:\Users\DEEPIJA\Downloads\chat-service\.env.example) to `.env`
2. Set:
   - `MYSQL_HOST`
   - `MYSQL_PORT`
   - `MYSQL_USER`
   - `MYSQL_PASS`
   - `MYSQL_DB`
   - `JWT_SHARED_SECRET`
   - `UPLOAD_PATH`
   - `ASSETS_PATH`
3. Run:

```bash
npm install
npm run migration:run
npm run start:prod
```

## Docker Deployment

The repo includes:

- [`Dockerfile`](C:\Users\DEEPIJA\Downloads\chat-service\Dockerfile)
- [`docker-compose.yml`](C:\Users\DEEPIJA\Downloads\chat-service\docker-compose.yml)

Quick start:

```bash
copy .env.example .env
npm run docker:up
```

The compose setup:

- starts MySQL
- waits for database readiness
- runs migrations on app startup
- serves the reference client from `/frontend/index.html`
- stores uploads in `./storage/assets`

## Uploads and Assets

The backend serves assets from:

```text
/api/v1/assets/
```

Recommended filesystem mapping:

- `ASSETS_PATH` = root directory for served assets
- `UPLOAD_PATH` = nested directory for uploaded chat files

Docker defaults:

- `ASSETS_PATH=/app/storage/assets`
- `UPLOAD_PATH=/app/storage/assets/chat/uploads`

## RTC / Calling Notes

For same-machine or same-network testing, the default STUN configuration is usually enough.

For broader connectivity:

- set `RTC_TURN_URLS`
- set `RTC_TURN_USERNAME`
- set `RTC_TURN_PASSWORD`
- keep `RTC_ICE_TRANSPORT_POLICY=all` unless you have a stricter deployment need

The backend handles signaling and call lifecycle state. Media transport stays in browser WebRTC.

## Reference Client

The supported validation UI is:

```text
/frontend/index.html
```

Use it to verify:

- auth
- realtime chat
- uploads
- audio calls
- video calls

## Troubleshooting

- `401 Unauthorized` in the reference client:
  - confirm `JWT_SHARED_SECRET` still matches the built-in demo tokens
- uploads not resolving:
  - confirm `ASSETS_PATH` and `UPLOAD_PATH` point to writable locations
- migrations fail on older databases:
  - older local databases may still reflect previous `synchronize` behavior
  - use migrations as the current source of truth
- WebRTC connects locally but fails over real networks:
  - provide TURN configuration
