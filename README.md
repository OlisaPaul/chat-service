# Chat Service

Self-hostable NestJS communication backend with:

- realtime chat
- named group conversations
- presence tracking
- file uploads
- 1:1 audio calling
- 1:1 video calling
- small group audio/video calling
- a browser-based reference client served by the backend
- optional Redis-backed multi-instance realtime mode

The backend is the main product surface. The in-repo UI at [`/frontend/index.html`](C:\Users\DEEPIJA\Downloads\chat-service\frontend\index.html) is the supported reference client for validation and onboarding, not a polished production app.

## What Works Today

- JWT-authenticated REST API under `/api/v1`
- Socket.IO chat, presence, and call signaling
- direct/private conversations
- named group conversations with admin-managed membership
- paginated message history and read state
- uploads served from `/api/v1/assets/...`
- persisted call sessions and call history
- 1:1 audio/video calling through browser WebRTC signaling
- group audio/video call lifecycle and small peer-to-peer mesh signaling from existing group conversations

## Stack

- NestJS
- TypeORM
- MySQL
- Socket.IO
- Multer
- Browser WebRTC for audio/video media

## Quick Start: Local

1. Install dependencies:

```bash
npm install
```

2. Create your local environment file:

```bash
copy .env.example .env
```

3. Keep the default `JWT_SHARED_SECRET` value if you want the built-in Alice/Bob demo users to work immediately.

4. Create the MySQL database named in `MYSQL_DB`.

5. Run migrations:

```bash
npm run migration:run
```

6. Start the backend:

```bash
npm run start:dev
```

7. Open the reference client:

```text
http://localhost:3001/frontend/index.html
```

## Quick Start: Docker

1. Create your local environment file:

```bash
copy .env.example .env
```

2. Start the app and MySQL:

```bash
npm run docker:up
```

3. Open the reference client:

```text
http://localhost:3001/frontend/index.html
```

Docker notes:

- the app runs migrations automatically on container startup
- uploaded files are stored in `./storage/assets`
- MySQL data is stored in the named volume `mysql_data`
- Docker uses `DOCKER_MYSQL_*` values so your host-local `MYSQL_*` settings do not break container startup
- Docker uses `DOCKER_REDIS_ENABLED=false` by default so Redis stays optional unless you explicitly opt into the realtime profile

Docker validation path:

1. Open `http://localhost:3001/frontend/index.html`
2. Sign in as `Alice`, `Bob`, and `Charlie`
3. Verify direct chat
4. Create a group and verify group messaging
5. Verify audio/video calling
6. Upload a file and confirm the asset URL works
7. Restart the app container and confirm uploaded assets still resolve

## Reference Client Flow

The supported validation path is:

1. Open the reference client in two tabs.
2. Select `Alice` in one tab and `Bob` in the other.
3. Send a direct message to confirm realtime chat works.
4. Create a named group and send a group message.
5. Add or remove a member from the group as the admin.
6. Start a group audio or video call from the active group and accept it from the other group-member tabs.
7. Switch back to the direct chat and start a 1:1 audio or video call.
8. Confirm chat, group membership, call, and hang-up behavior.

If you change `JWT_SHARED_SECRET`, the built-in Alice/Bob tokens in [`frontend/index.html`](C:\Users\DEEPIJA\Downloads\chat-service\frontend\index.html) will no longer authenticate.

## Configuration

Primary environment groups in [`.env.example`](C:\Users\DEEPIJA\Downloads\chat-service\.env.example):

- app
- database
- auth
- uploads and assets
- feature flags
- RTC
- shared realtime state
- Socket.IO admin UI
- dev tooling

Important defaults:

- `DB_SYNCHRONIZE=false`
- `CORS_ORIGINS=http://localhost:3001,http://127.0.0.1:3001`
- `UPLOAD_PATH=storage/assets/chat/uploads`
- `ASSETS_PATH=storage/assets`
- `SOCKET_ADMIN_ENABLED=false`

Local development note:

- localhost and `127.0.0.1` origins on any port are accepted automatically for browser testing, including multi-instance local runs such as ports `3001` and `3002`

Migrations are the supported schema path for self-host installs. Runtime schema sync is not the recommended default.

## Auth Modes

The default auth mode is still JWT with claim-based user mapping.

The auth layer is now split internally into:

- token verification
- profile/claim mapping
- user materialization

Current supported default:

- `AUTH_PROVIDER=jwt`

Current provisioning modes:

- `AUTH_AUTO_PROVISION_USERS=true`: create/update users from incoming auth claims
- `AUTH_AUTO_PROVISION_USERS=false`: require users to already exist in the database

The default Alice/Bob reference flow still assumes the built-in JWT mode.

## Multi-Instance Mode

Single-node mode works without Redis.

For production-minded multi-instance deployments:

- set `REDIS_ENABLED=true`
- set `REDIS_HOST`/`REDIS_PORT` or `REDIS_URL`
- run more than one app instance behind your proxy/load balancer

Redis-backed mode enables:

- shared presence state
- cross-instance Socket.IO room/event delivery
- consistent chat/call socket behavior when users hit different app instances

Redis is only enabled when you explicitly set `REDIS_ENABLED=true` or provide a `REDIS_URL` without overriding the flag.

## Dev Tunnel

For temporary remote-device testing, you can expose the backend and reference client through ngrok:

```bash
npm run tunnel:dev
```

Requirements:

- set `NGROK_AUTHTOKEN` in `.env` or your shell
- keep the terminal running while testing

The command prints a `Remote test URL` that points to `/frontend/index.html` through the ngrok tunnel.

## Scripts

- `npm run start:dev`
- `npm run build`
- `npm test -- --runInBand`
- `npm run migration:run`
- `npm run docker:up`
- `npm run docker:down`
- `npm run tunnel:dev`

## Project Docs

- [`API.md`](C:\Users\DEEPIJA\Downloads\chat-service\API.md): current REST and socket contract
- [`Understanding This Codebase.md`](C:\Users\DEEPIJA\Downloads\chat-service\Understanding%20This%20Codebase.md): architecture and onboarding guide
- [`CONTRIBUTING.md`](C:\Users\DEEPIJA\Downloads\chat-service\CONTRIBUTING.md): contributor workflow
- [`DEPLOYMENT.md`](C:\Users\DEEPIJA\Downloads\chat-service\DEPLOYMENT.md): self-host guidance

## Current Limits

- group calls use a small peer-to-peer mesh in the reference client
- larger production conferencing still needs a future SFU/media-server architecture
- no recording
- no SFU/media-server integration
- reference client is intentionally minimal
- Redis is the current scale-ready path for multi-instance realtime behavior, but broader HA/production architecture is still a later phase

## License

MIT. See [`LICENSE`](C:\Users\DEEPIJA\Downloads\chat-service\LICENSE).
