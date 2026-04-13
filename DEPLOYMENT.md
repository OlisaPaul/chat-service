# Deployment and Self-Hosting

This project is a self-hostable NestJS communication backend with a built-in reference client.

## Minimum Supported Stack

- Node.js 22+
- MySQL 8+
- writable filesystem path for uploaded assets

Optional for remote WebRTC testing:

- STUN server
- TURN server for broader real-world connectivity
- Redis for multi-instance realtime behavior

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
- keeps Docker database bootstrap values separate from your host-local `MYSQL_*` settings

Docker-specific environment note:

- `MYSQL_*` can stay pointed at your host or cloud database for non-Docker development
- `DOCKER_MYSQL_*` is what compose uses to initialize the MySQL container and to point the app container at that database
- `DOCKER_REDIS_ENABLED=false` keeps the default Docker stack in single-node mode even if your host `.env` has Redis enabled
- only enable Docker Redis-backed mode when you also start the `realtime` compose profile

Docker validation checklist:

1. `docker compose up --build`
2. confirm MySQL becomes healthy
3. confirm the app logs show DB wait, migration success, and application startup
4. open `http://localhost:3001/frontend/index.html`
5. sign in as `Alice`, `Bob`, and `Charlie`
6. verify direct chat
7. create and use a group conversation
8. verify audio/video calling
9. upload a file and confirm the asset URL resolves
10. restart the app container and confirm uploaded assets still resolve

Optional Redis profile:

```bash
docker compose --profile realtime up --build
```

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

## Multi-Instance Realtime

For more than one backend instance:

- set `REDIS_ENABLED=true`
- configure `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT`
- ensure all instances share the same Redis deployment

Redis-backed mode is used for:

- presence state
- cross-instance Socket.IO room broadcasts
- chat/call signaling across app instances

Redis stays off in the default Docker stack unless you explicitly turn it on. Setting `REDIS_HOST` alone is not enough.

## Production Hardening Notes

- `SOCKET_ADMIN_ENABLED=false` is the recommended default outside local debugging.
- `CORS_ORIGINS` should be set explicitly for any production-minded deployment.
- Socket room joins are now validated against conversation membership.
- Presence is tracked per socket in memory and only emits offline when a user's last socket disconnects.
- When Redis-backed realtime mode is enabled, presence and socket fan-out work across instances.

## Reference Client

The supported validation UI is:

```text
/frontend/index.html
```

Use it to verify:

- auth
- realtime chat
- uploads
- 1:1 audio/video calls
- small group audio/video calls from existing group conversations

## Troubleshooting

- `docker compose up` fails with `MYSQL_USER="root"`:
  - your local `.env` is likely using `MYSQL_USER=root`
  - compose now uses `DOCKER_MYSQL_*` to avoid this conflict
  - if you customized them, confirm `DOCKER_MYSQL_USER` is not `root`
- `401 Unauthorized` in the reference client:
  - confirm `JWT_SHARED_SECRET` still matches the built-in demo tokens
- uploads not resolving:
  - confirm `ASSETS_PATH` and `UPLOAD_PATH` point to writable locations
- migrations fail on older databases:
  - older local databases may still reflect previous `synchronize` behavior
  - use migrations as the current source of truth
- WebRTC connects locally but fails over real networks:
  - provide TURN configuration
