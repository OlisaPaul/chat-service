# API and Socket Contract

This document describes the current supported platform surface for the self-hostable chat and 1:1 calling stack. The reference client is one consumer of this contract, not the definition of the contract itself.

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

#### `GET /api/v1/users/me`

Returns the current authenticated user.

#### `GET /api/v1/users/online`

Paginated list of users currently online according to the in-memory presence state.

### Conversations

#### `POST /api/v1/conversations/private/:otherUserId`

Creates or returns a direct conversation.

Notes:

- `:otherUserId` accepts either an internal numeric user ID or an external ID such as `appA:bob`
- this is the reference-client entry point for direct chat/call sessions

#### `POST /api/v1/conversations/group`

Creates a named group conversation.

Example request:

```json
{
  "name": "Project Team",
  "participantIds": ["appA:bob", "appA:charlie"]
}
```

Current behavior:

- the authenticated user becomes the initial `admin`
- invited users start as `member`
- the group name is required

#### `GET /api/v1/conversations/:conversationId`

Returns the conversation details for the current member, including participant roles.

#### `POST /api/v1/conversations/:conversationId/members`

Adds one or more members to a group conversation.

Example request:

```json
{
  "participantIds": ["appA:charlie"]
}
```

Current behavior:

- only group admins can add members
- only existing users can be added
- already-present members are ignored

#### `DELETE /api/v1/conversations/:conversationId/members/:participantExternalId`

Removes a non-admin member from a group conversation.

Current behavior:

- only group admins can remove members
- admin removal or transfer is not supported in this phase

#### `POST /api/v1/conversations/:conversationId/leave`

Leaves a group conversation.

Current behavior:

- regular members can leave
- admins cannot leave until admin transfer is supported

#### `GET /api/v1/conversations`

Paginated list of the current user's conversations.

Conversation payloads now distinguish:

- `type: "private"`
- `type: "group"`

Group payloads include:

- `name`
- `participants`
- each participant's `role`

### Messages

#### `GET /api/v1/messages/:conversationId`

Paginated message history for a conversation.

#### `POST /api/v1/messages/:conversationId`

Send a message by REST.

Example request:

```json
{
  "content": "Hello",
  "mediaUrl": null,
  "mediaType": null
}
```

#### `POST /api/v1/messages/upload`

Upload a file and receive an asset URL plus inferred media type.

Example response:

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

Returns the RTC configuration consumed by WebRTC clients.

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

The current platform uses one Socket.IO connection for chat, presence, and calling.

In multi-instance deployments, shared socket delivery depends on Redis-backed realtime mode.

### Connection/Auth

The reference client sends the JWT in the socket auth payload:

```json
{
  "token": "<jwt-token>"
}
```

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

Important behavior:

- realtime messages are broadcast to the conversation room
- the reference client joins the active conversation room after loading or creating the conversation
- server-side conversation room joins are validated against conversation membership
- the same chat socket flow is used for both direct and group conversations

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

Supported call types:

- `audio`
- `video`

Call-state events return the full current call/session object used by the reference client, including:

- `id`
- `status`
- `type`
- `initiator`
- `participants`
- `media`

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

Important behavior:

- signaling is only relayed for valid participants in valid call states
- the server is the source of truth for call lifecycle state
- browser media acquisition stays on the client side
- in multi-instance mode, call events and signaling rely on the Redis-backed Socket.IO adapter

## Reference Client Notes

The reference client is available at:

```text
/frontend/index.html
```

It is intended for:

- onboarding
- manual validation
- API/socket contract smoke testing

Current validation flows in the reference client:

- direct chat
- named group chat with basic membership management
- 1:1 audio calling
- 1:1 video calling

It is not intended to define production UX or product policy.
