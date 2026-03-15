# API and Socket Contract

This document describes the current public surface for the reference chat and 1:1 calling flow. The reference client now supports both audio and video while keeping the same call contract and signaling model.

Base REST prefix:

```text
/api/v1
```

Authentication:

```text
Authorization: Bearer <jwt-token>
```

## REST Endpoints

### Auth

#### `GET /api/v1/auth/me`

Returns the authenticated user record materialized by the JWT strategy.

### Users

#### `GET /api/v1/users`

Paginated list of users except the current user.

Response shape:

```json
{
  "data": [
    {
      "id": 2,
      "externalId": "appA:bob",
      "name": "Bob"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false,
    "from": 1,
    "to": 1
  }
}
```

#### `GET /api/v1/users/me`

Returns the current authenticated user.

#### `GET /api/v1/users/online`

Paginated list of users currently online according to the in-memory presence state.

### Conversations

#### `POST /api/v1/conversations/private/:otherUserId`

Creates or returns a direct conversation.

Important note:

- `:otherUserId` now accepts either an internal numeric user ID or an external ID such as `appA:bob`

#### `GET /api/v1/conversations`

Paginated list of the current user’s conversations.

### Messages

#### `GET /api/v1/messages/:conversationId`

Paginated message history for a conversation.

#### `POST /api/v1/messages/:conversationId`

Send a message by REST.

Request:

```json
{
  "content": "Hello",
  "mediaUrl": null,
  "mediaType": null
}
```

#### `POST /api/v1/messages/upload`

Upload a file and receive an asset URL plus inferred media type.

Response:

```json
{
  "url": "/api/v1/assets/chat/uploads/file-12345.mp4",
  "mediaType": "video"
}
```

### Presence

#### `GET /api/v1/presence/online-users`

Returns online socket/user mappings from the in-memory presence state.

#### `GET /api/v1/presence/stats`

Returns presence counters and recent event count.

### Calls

#### `GET /api/v1/calls/active`

Returns the current active call for the authenticated user, or `null`.

#### `GET /api/v1/calls/history`

Paginated call history for the authenticated user.

#### `GET /api/v1/calls/rtc-config`

Returns the RTC configuration consumed by the reference browser client.

Example:

```json
{
  "stunUrls": ["stun:stun.l.google.com:19302"],
  "turnUrls": [],
  "turnUsername": "",
  "turnPassword": "",
  "iceTransportPolicy": "all"
}
```

## Socket Events

The current reference client uses one Socket.IO connection for chat, presence, and calls.

### Chat and Presence Events

Client -> Server:

- `join`
- `send_message`
- `typing_start`
- `typing_stop`
- `mark_as_read`

Server -> Client:

- `new_message`
- `user_typing`
- `messages_read`
- `user_status_changed`

### Call Lifecycle Events

Client -> Server:

- `start_call`
- `accept_call`
- `reject_call`
- `cancel_call`
- `end_call`

Server -> Client:

- `incoming_call`
- `call_answered`
- `call_rejected`
- `call_cancelled`
- `call_ended`
- `call_state_changed`

### WebRTC Signaling Events

Client -> Server:

- `webrtc_offer`
- `webrtc_answer`
- `ice_candidate`

Server -> Client:

- `webrtc_offer`
- `webrtc_answer`
- `ice_candidate`

Client payload shape:

```json
{
  "callId": 12,
  "targetUserExternalId": "appA:bob",
  "sdp": {},
  "candidate": {}
}
```

Relayed server payloads include:

```json
{
  "callId": 12,
  "fromUserExternalId": "appA:alice",
  "sdp": {},
  "candidate": {}
}
```

WebRTC signaling is only valid for accepted calls and authenticated call participants. Stale or terminal sessions should not continue exchanging signaling messages.

## Call Object Shape

The socket call lifecycle and the `calls` REST endpoints use the same high-level response shape:

```json
{
  "id": 12,
  "type": "audio",
  "status": "ringing",
  "initiatorId": 1,
  "initiator": {
    "userId": 1,
    "externalId": "appA:alice",
    "name": "Alice"
  },
  "media": {
    "hasAudio": true,
    "hasVideo": false
  },
  "participants": [
    {
      "userId": 1,
      "externalId": "appA:alice",
      "name": "Alice",
      "role": "caller",
      "status": "accepted",
      "mediaIntent": {
        "sendAudio": true,
        "sendVideo": false,
        "receiveAudio": true,
        "receiveVideo": false
      }
    },
    {
      "userId": 2,
      "externalId": "appA:bob",
      "name": "Bob",
      "role": "callee",
      "status": "invited",
      "mediaIntent": {
        "sendAudio": true,
        "sendVideo": false,
        "receiveAudio": true,
        "receiveVideo": false
      }
    }
  ],
  "startedAt": null,
  "endedAt": null,
  "createdAt": "2026-03-12T21:00:00.000Z",
  "updatedAt": "2026-03-12T21:00:00.000Z"
}
```

## Reference Demo Notes

The current reference client is [`frontend/index.html`](C:\Users\DEEPIJA\Downloads\chat-service\frontend\index.html).

It is intentionally simple:

- two demo users
- direct chat with explicit target selection
- separate audio and video start actions
- browser microphone capture for audio calls
- browser microphone and camera capture for video calls
- call accept/reject/hang-up controls
- active call re-sync on reconnect using `GET /api/v1/calls/active`

## Troubleshooting Notes

- If the demo receives a `401`, check the demo JWTs in [`frontend/index.html`](C:\Users\DEEPIJA\Downloads\chat-service\frontend\index.html) and the backend `JWT_SHARED_SECRET`.
- If call state looks stale after a browser reconnect, the reference client rechecks `GET /api/v1/calls/active`; `null` means the server no longer considers the call active.
- If a video call fails before it starts, check browser camera and microphone permissions.
- The current reference client does not silently degrade a failed video call into audio-only; it reports the device error instead.
- If a database already contains schema changes from `synchronize`, migrations should still be treated as the supported schema history going forward.
