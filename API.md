# Chat Service API Documentation

## Overview

The Chat Service provides REST and WebSocket APIs for real-time messaging, user management, and conversation handling. All REST endpoints require JWT authentication.

## Authentication

All API endpoints require a valid JWT token in the `Authorization` header:
```
Authorization: Bearer <jwt-token>
```

### JWT Payload Structure
```json
{
  "sub": "appA:user123",
  "name": "John Doe",
  "iat": 1638360000,
  "exp": 1638964800
}
```

## REST API Endpoints

### Authentication

#### GET /auth/me
Returns the authenticated user's information.

**Response:**
```json
{
  "externalId": "appA:user123",
  "name": "John Doe"
}
```

### Users

#### GET /users
Get all users.

**Response:**
```json
[
  {
    "id": 1,
    "externalId": "appA:user123",
    "name": "John Doe",
    "avatarUrl": "https://example.com/avatar.jpg",
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
]
```

#### POST /users
Create a new user.

**Request:**
```json
{
  "externalId": "appA:user123",
  "name": "John Doe",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

### Conversations

#### GET /conversations
Get all conversations for the authenticated user.

**Response:**
```json
[
  {
    "id": 1,
    "participants": [
      {
        "id": 1,
        "externalId": "appA:user123",
        "name": "John Doe"
      },
      {
        "id": 2,
        "externalId": "appA:user456",
        "name": "Jane Smith"
      }
    ],
    "lastMessage": {
      "id": 1,
      "content": "Hello!",
      "senderName": "John Doe",
      "sentByMe": false,
      "status": "delivered",
      "createdAt": "2023-01-01T00:00:00.000Z"
    },
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
]
```

#### POST /conversations/private/:partnerExternalId
Create a private conversation with another user.

**Parameters:**
- `partnerExternalId`: External ID of the user to chat with (e.g., "appA:user456")

**Response:**
```json
{
  "id": 1,
  "participants": [...],
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

#### POST /conversations/group
Create a group conversation.

**Request:**
```json
{
  "name": "Project Team",
  "participantIds": ["appA:user123", "appA:user456", "appA:user789"]
}
```

### Messages

#### GET /messages/:conversationId
Get messages for a specific conversation.

**Parameters:**
- `conversationId`: ID of the conversation
- `limit` (optional): Number of messages to return (default: 20)
- `offset` (optional): Number of messages to skip (default: 0)

**Response:**
```json
[
  {
    "id": 1,
    "content": "Hello!",
    "imageUrl": null,
    "senderName": "John Doe",
    "sentByMe": false,
    "status": "delivered",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "conversationId": 1
  }
]
```

#### POST /messages/:conversationId
Send a message to a conversation.

**Parameters:**
- `conversationId`: ID of the conversation

**Request:**
```json
{
  "content": "Hello, world!",
  "imageUrl": null
}
```

**Response:**
```json
{
  "id": 1,
  "content": "Hello, world!",
  "imageUrl": null,
  "senderName": "John Doe",
  "sentByMe": true,
  "status": "sent",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "conversationId": 1
}
```

#### POST /messages/upload
Upload an image file.

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: Image file (max 5MB, image/* types only)

**Response:**
```json
{
  "url": "/assets/chat/uploads/file-1234567890.jpg"
}
```

## WebSocket Events

### Connection

Connect to the WebSocket server with authentication:
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: 'your-jwt-token' },
  transports: ['websocket', 'polling']
});
```

### Events

#### Client → Server

##### send_message
Send a message to a conversation.

```javascript
socket.emit('send_message', {
  conversationId: 1,
  content: 'Hello, world!', // optional
  imageUrl: '/assets/chat/uploads/image.jpg' // optional
});
```

##### mark_as_read
Mark messages in a conversation as read.

```javascript
socket.emit('mark_as_read', conversationId);
```

##### typing_start
Indicate that the user started typing.

```javascript
socket.emit('typing_start', conversationId);
```

##### typing_stop
Indicate that the user stopped typing.

```javascript
socket.emit('typing_stop', conversationId);
```

#### Server → Client

##### new_message
A new message was sent in a conversation the user is part of.

```javascript
socket.on('new_message', (message) => {
  console.log('New message:', message);
  // message structure same as REST API response
});
```

##### messages_read
Messages in a conversation were marked as read.

```javascript
socket.on('messages_read', (data) => {
  console.log('Messages read in conversation:', data.conversationId);
});
```

##### user_typing
A user in the conversation started/stopped typing.

```javascript
socket.on('user_typing', (data) => {
  console.log('User typing:', data);
  // data: { conversationId, userId, userName, isTyping }
});
```

##### conversation_created
A new conversation was created (when user is a participant).

```javascript
socket.on('conversation_created', (conversation) => {
  console.log('New conversation:', conversation);
});
```

##### conversation_updated
A conversation was updated.

```javascript
socket.on('conversation_updated', (conversation) => {
  console.log('Conversation updated:', conversation);
});
```

## Message Status

Messages have three status levels:

- **sent**: Message was sent but not yet delivered
- **delivered**: Message was delivered to recipients
- **read**: Message was read by recipients

## File Upload

Images are uploaded via the `/messages/upload` endpoint and stored in `/home/assets/chat/uploads/`. Files are served statically at `/assets/chat/uploads/filename`.

### Upload Process

1. Client uploads file to `/messages/upload`
2. Server returns file URL
3. Client sends message with `imageUrl` field
4. Image is displayed in chat interface

## Error Handling

All API endpoints return appropriate HTTP status codes:

- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

Error responses include a message field with details.

## Rate Limiting

WebSocket events are not rate limited, but REST endpoints should implement appropriate rate limiting in production.

## Data Types

### User
```typescript
{
  id: number;
  externalId: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
}
```

### Conversation
```typescript
{
  id: number;
  participants: User[];
  lastMessage?: Message;
  createdAt: Date;
}
```

### Message
```typescript
{
  id: number;
  content?: string;
  imageUrl?: string;
  senderName: string;
  sentByMe: boolean;
  status: 'sent' | 'delivered' | 'read';
  createdAt: Date;
  conversationId: number;
}
```

## Testing

Use the provided test tokens for development:

```javascript
const tokens = {
  alice: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  bob: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  // ... more tokens
};
```

Open `http://localhost:3001` in multiple browser tabs to test real-time messaging.