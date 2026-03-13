# Chat Service

A self-hostable NestJS communication backend with:

- real-time chat
- presence tracking
- file uploads
- a reference 1:1 audio-calling flow using Socket.IO signaling plus browser WebRTC

The backend is the main product surface. The included [`frontend/index.html`](C:\Users\DEEPIJA\Downloads\chat-service\frontend\index.html) is the reference demo for this sprint, not a polished production client.

## What Works Now

- JWT-authenticated REST API under `/api/v1`
- Socket.IO messaging and presence events
- direct/private conversations
- message history, typing indicators, and read state
- upload handling for images, video, audio, and supported documents
- persisted call sessions and call history
- 1:1 audio call signaling with WebRTC offer/answer/ICE relay
- reference browser demo for chat plus audio calling

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

## Reference Audio Call Demo

Recommended local flow:

1. Start the backend.
2. Open the reference demo in two browser tabs.
3. Select `Alice` in one tab and `Bob` in the other.
4. Allow microphone access in both tabs.
5. Send a chat message to confirm the conversation is active.
6. Click `Start audio call` in one tab.
7. Click `Accept` in the other tab.
8. Confirm audio connects.
9. Click `Hang up` to end the call.

Secondary manual checks:

- reject an incoming call
- cancel a ringing outgoing call
- disable calling with `FEATURE_CALLS=false`
- verify chat still works before and after a call

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

- 1:1 audio is the sprint target
- video remains in the model but is not the polished reference flow yet
- no group calling
- no recording
- no production-grade SFU/media-server integration

## Key Files

- [`src/app.module.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\app.module.ts)
- [`src/messages/messages.gateway.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.gateway.ts)
- [`src/presence/presence.gateway.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\presence\presence.gateway.ts)
- [`src/calls/calls.service.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\calls\calls.service.ts)
- [`src/calls/calls.gateway.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\calls\calls.gateway.ts)
- [`frontend/index.html`](C:\Users\DEEPIJA\Downloads\chat-service\frontend\index.html)
