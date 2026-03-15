# Chat Service

A self-hostable NestJS communication backend with:

- real-time chat
- presence tracking
- file uploads
- a reference 1:1 audio/video calling flow using Socket.IO signaling plus browser WebRTC

The backend is the main product surface. The included [`frontend/index.html`](C:\Users\DEEPIJA\Downloads\chat-service\frontend\index.html) is the reference demo for this sprint, not a polished production client.

## What Works Now

- JWT-authenticated REST API under `/api/v1`
- Socket.IO messaging and presence events
- direct/private conversations
- message history, typing indicators, and read state
- upload handling for images, video, audio, and supported documents
- persisted call sessions and call history
- 1:1 audio/video call signaling with WebRTC offer/answer/ICE relay
- reference browser demo for chat plus audio/video calling

## Stack

- NestJS
- TypeORM
- MySQL
- Socket.IO
- Multer
- Browser WebRTC for audio calling

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from [`.env.example`](C:\Users\DEEPIJA\Downloads\chat-service\.env.example):

```bash
copy .env.example .env
```

3. Create the MySQL database named in `MYSQL_DB`.

4. Start the backend:

```bash
npm run start:dev
```

5. Open the reference demo:

```text
http://localhost:3001/frontend/index.html
```

If static frontend hosting is not wired in your environment, open the file directly from the repo.

## Temporary Remote Testing Tunnel

If you want to open the reference demo from another device on the same temporary backend, use:

```bash
npm run tunnel:dev
```

What it does:

- starts or reuses the backend on port `3001`
- serves [`frontend/index.html`](C:\Users\DEEPIJA\Downloads\chat-service\frontend\index.html) through the Nest app at `/frontend/index.html`
- opens one HTTPS ngrok tunnel to the backend
- prints a final `Remote test URL` you can open on another device

Before running it, set `NGROK_AUTHTOKEN` in your shell or `.env`.

Example PowerShell session:

```powershell
$env:NGROK_AUTHTOKEN="your-ngrok-token"
npm run tunnel:dev
```

Notes:

- keep the terminal running while testing
- press `Ctrl+C` to close the tunnels and local servers
- open the printed `Remote test URL` on the other device

## Environment Notes

Important variables:

- `PORT`
- `API_PREFIX`
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASS`
- `MYSQL_DB`
- `JWT_SHARED_SECRET`
- `FEATURE_CALLS`
- `UPLOAD_PATH`
- `ASSETS_PATH`
- `RTC_STUN_URLS`
- `RTC_TURN_URLS`
- `RTC_TURN_USERNAME`
- `RTC_TURN_PASSWORD`
- `RTC_ICE_TRANSPORT_POLICY`

For simple local testing, STUN is usually enough when both browser tabs run on the same machine or local network. For broader real-world connectivity, provide TURN settings.

## Reference Call Demo

Recommended local flow:

1. Start the backend.
2. Open the reference demo in two browser tabs.
3. Select `Alice` in one tab and `Bob` in the other.
4. Allow microphone access in both tabs.
5. Send a chat message to confirm the conversation is active.
6. Click `Start audio call` or `Start video call` in one tab.
7. Click `Accept` in the other tab.
8. Confirm audio connects and, for video calls, confirm both local and remote video render.
9. Click `Hang up` to end the call.

Secondary manual checks:

- reject an incoming call
- cancel a ringing outgoing call
- close one tab during a ringing or active call and confirm the remaining tab receives a terminal state
- deny camera access for a video call and confirm the client shows a clear error instead of silently falling back
- disable calling with `FEATURE_CALLS=false`
- verify chat still works before and after a call

## Self-Host Basics

Use this sequence for a fresh environment:

1. Create the MySQL database named in `MYSQL_DB`.
2. Copy [`.env.example`](C:\Users\DEEPIJA\Downloads\chat-service\.env.example) to `.env` and set:
   - `MYSQL_*`
   - `JWT_SHARED_SECRET`
   - `UPLOAD_PATH`
   - `ASSETS_PATH`
3. Run migrations:

```bash
npm run migration:run
```

4. Start the backend:

```bash
npm run start:dev
```

`DB_SYNCHRONIZE=true` can still work in development, but migrations are the intended schema artifact for self-hosted installs.

## Schema and Migrations

The calling feature adds:

- `call_sessions`
- `call_participants`

Migration artifact:

- [`src/migrations/1764861000000-CreateCallTables.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\migrations\1764861000000-CreateCallTables.ts)

The app still supports runtime schema sync in config, but the calling schema is now explicitly represented in migrations and should be treated as part of the supported platform model.

## Testing

Run the current automated suite:

```bash
npm test -- --runInBand
```

Build verification:

```bash
npm run build
```

## Current Limits

- 1:1 audio and video are supported in the reference client
- the video UX is intentionally minimal and focused on proving the media path
- no group calling
- no recording
- no production-grade SFU/media-server integration

## Troubleshooting

- `401 Unauthorized` when selecting Alice or Bob:
  - confirm `JWT_SHARED_SECRET` matches the secret used for the demo tokens in [`frontend/index.html`](C:\Users\DEEPIJA\Downloads\chat-service\frontend\index.html)
- Port mismatch:
  - the reference client expects the backend on `http://localhost:3001`
- Migration drift:
  - older databases may already contain changes applied through `synchronize`
  - use migrations as the schema source of truth for self-hosted installs
- Unexpected demo target:
  - use the target dropdown to explicitly choose who to message or call
- Camera or microphone failure:
  - video calls require both camera and microphone access
  - audio calls require microphone access

## Key Files

- [`src/app.module.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\app.module.ts)
- [`src/messages/messages.gateway.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.gateway.ts)
- [`src/presence/presence.gateway.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\presence\presence.gateway.ts)
- [`src/calls/calls.service.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\calls\calls.service.ts)
- [`src/calls/calls.gateway.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\calls\calls.gateway.ts)
- [`frontend/index.html`](C:\Users\DEEPIJA\Downloads\chat-service\frontend\index.html)
