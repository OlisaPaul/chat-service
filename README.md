# Chat Service

Self-hostable NestJS communication backend with:

- realtime chat
- presence tracking
- file uploads
- 1:1 audio calling
- 1:1 video calling
- a browser-based reference client served by the backend

The backend is the main product surface. The in-repo UI at [`/frontend/index.html`](C:\Users\DEEPIJA\Downloads\chat-service\frontend\index.html) is the supported reference client for validation and onboarding, not a polished production app.

## What Works Today

- JWT-authenticated REST API under `/api/v1`
- Socket.IO chat, presence, and call signaling
- direct/private conversations
- paginated message history and read state
- uploads served from `/api/v1/assets/...`
- persisted call sessions and call history
- 1:1 audio/video calling through browser WebRTC signaling

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

## Reference Client Flow

The supported validation path is:

1. Open the reference client in two tabs.
2. Select `Alice` in one tab and `Bob` in the other.
3. Send a message to confirm realtime chat works.
4. Start an audio or video call.
5. Accept in the other tab.
6. Confirm chat, call, and hang-up behavior.

If you change `JWT_SHARED_SECRET`, the built-in Alice/Bob tokens in [`frontend/index.html`](C:\Users\DEEPIJA\Downloads\chat-service\frontend\index.html) will no longer authenticate.

## Configuration

Primary environment groups in [`.env.example`](C:\Users\DEEPIJA\Downloads\chat-service\.env.example):

- app
- database
- auth
- uploads and assets
- feature flags
- RTC
- Socket.IO admin UI
- dev tooling

Important defaults:

- `DB_SYNCHRONIZE=false`
- `UPLOAD_PATH=storage/assets/chat/uploads`
- `ASSETS_PATH=storage/assets`
- `SOCKET_ADMIN_ENABLED=false`

Migrations are the supported schema path for self-host installs. Runtime schema sync is not the recommended default.

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

- 1:1 calls only
- no recording
- no group calling
- no SFU/media-server integration
- reference client is intentionally minimal

## License

MIT. See [`LICENSE`](C:\Users\DEEPIJA\Downloads\chat-service\LICENSE).
