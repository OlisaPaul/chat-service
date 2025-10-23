# Chat Service Architecture

## System Overview

The Chat Service is a real-time messaging application built with a microservices-ready architecture using NestJS, TypeORM, MySQL, and Socket.IO. It provides comprehensive chat functionality including text messaging, image sharing, user management, and real-time communication.

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │   NestJS API    │    │     MySQL DB    │
│                 │    │                 │    │                 │
│  ┌────────────┐ │    │  ┌────────────┐ │    │  ┌────────────┐ │
│  │ Frontend   │◄┼────┼─►│ Controllers │◄┼────┼─►│  Entities  │ │
│  │ (HTML/JS)  │ │    │  │             │ │    │  │             │ │
│  └────────────┘ │    │  └────────────┘ │    │  └────────────┘ │
│                 │    │                 │    │                 │
│  Socket.IO      │◄───┼──► WebSocket     │    │  File System   │
│  Client         │    │  Gateway        │    │  (/assets/)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   JWT Auth      │
                    │   Service       │
                    └─────────────────┘
```

## Core Components

### 1. Frontend Layer

**Technology:** Vanilla JavaScript, HTML5, CSS3
**Responsibilities:**
- User interface and interactions
- Real-time communication via Socket.IO
- File upload handling
- Responsive design for mobile/desktop

**Key Files:**
- `frontend/index.html` - Complete chat interface
- Socket.IO client integration
- JWT token management

### 2. API Layer (NestJS)

**Technology:** NestJS, TypeScript, Express
**Responsibilities:**
- REST API endpoints
- WebSocket gateway
- Authentication and authorization
- File upload processing
- Business logic orchestration

**Modules:**
- **AppModule** - Root module, database configuration
- **AuthModule** - JWT strategy and guards
- **UsersModule** - User management
- **ConversationsModule** - Conversation handling
- **MessagesModule** - Message operations and WebSocket

### 3. Data Layer

**Technology:** TypeORM, MySQL
**Responsibilities:**
- Data persistence
- Entity relationships
- Query optimization
- Schema migrations

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  externalId VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatarUrl VARCHAR(500),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Conversations Table
```sql
CREATE TABLE conversations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Conversation Participants Table
```sql
CREATE TABLE conversation_participants (
  conversationId INT,
  userId INT,
  PRIMARY KEY (conversationId, userId),
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

### Messages Table
```sql
CREATE TABLE messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  conversationId INT NOT NULL,
  senderId INT NOT NULL,
  content TEXT,
  imageUrl VARCHAR(500),
  status ENUM('sent', 'delivered', 'read') DEFAULT 'sent',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE
);
```

## Authentication Flow

```
1. User Login (External System)
       ↓
2. JWT Token Generation
       ↓
3. Token Sent in HTTP Headers
       ↓
4. REST API Authentication (JwtGuard)
       ↓
5. WebSocket Authentication (WsJwtGuard)
       ↓
6. User Context Available in Requests
```

## Real-Time Communication Flow

```
User A Sends Message:
1. Frontend → Socket.IO emit('send_message')
2. Gateway → Validate JWT & Extract User
3. Service → Save Message to Database
4. Gateway → Broadcast to Room Participants
5. Frontend → Update UI with New Message
6. Status → Update to 'delivered'
```

## File Upload Flow

```
Image Upload:
1. User selects file → FormData
2. POST /messages/upload → Multer processing
3. File saved to /home/assets/chat/uploads/
4. Return file URL to client
5. Client sends message with imageUrl
6. Image displayed in chat interface
```

## WebSocket Architecture

### Connection Management
- **Authentication**: JWT tokens validated on connection
- **Rooms**: Users join conversation-specific rooms
- **Events**: Bidirectional communication

### Event Types
- **Client → Server**: send_message, mark_as_read, typing_start, typing_stop
- **Server → Client**: new_message, messages_read, user_typing, conversation_created

## Security Considerations

### Authentication
- JWT tokens with expiration
- Stateless authentication
- External ID system for multi-app support

### Authorization
- Guards protect all endpoints
- User-scoped data access
- Conversation participant validation

### File Upload Security
- File type validation (images only)
- Size limits (5MB)
- Unique filename generation
- Static file serving isolation

## Performance Optimizations

### Database
- Indexed foreign keys
- Query optimization with TypeORM
- Connection pooling

### Real-Time
- Room-based message broadcasting
- Efficient WebSocket connections
- Message pagination

### Frontend
- Optimistic UI updates
- Lazy loading of messages
- Responsive image sizing

## Scalability Considerations

### Horizontal Scaling
- Stateless API design
- External session storage (Redis)
- Database read replicas
- Load balancer for multiple instances

### WebSocket Scaling
- Redis adapter for Socket.IO clustering
- Sticky sessions or external state management
- Message queue for cross-instance communication

### File Storage
- CDN integration for image serving
- Distributed file storage (S3, MinIO)
- Image optimization and compression

## Deployment Architecture

### Development
```
Local Machine
├── Node.js Application (Port 3001)
├── MySQL Database (Local)
└── File Storage (/home/assets)
```

### Production
```
Docker Containers / Cloud
├── API Service (NestJS)
├── Database Service (MySQL)
├── File Storage Service (NFS/S3)
├── Reverse Proxy (Nginx)
└── Load Balancer
```

## Monitoring and Logging

### Application Logs
- Request/response logging
- Error tracking
- WebSocket connection monitoring
- Database query logging

### Performance Metrics
- Response times
- WebSocket connection count
- Message throughput
- File upload statistics

## Development Workflow

### Local Development
1. Clone repository
2. Install dependencies (`npm install`)
3. Configure environment (`.env`)
4. Start database
5. Run application (`npm run start:dev`)
6. Open browser to `http://localhost:3001`

### Testing
- Unit tests for services
- E2E tests for API endpoints
- WebSocket integration tests
- File upload testing

### CI/CD Pipeline
- Automated testing
- Code quality checks
- Docker image building
- Deployment to staging/production

## API Design Principles

### RESTful Design
- Resource-based URLs
- HTTP methods for CRUD operations
- JSON responses
- Proper status codes

### Real-Time Design
- Event-driven architecture
- Room-based communication
- Efficient payload structures
- Connection state management

### Error Handling
- Consistent error responses
- Proper HTTP status codes
- Detailed error messages
- Graceful degradation

## Future Enhancements

### Planned Features
- Message reactions and replies
- Voice/video calling
- Push notifications
- Message encryption
- Advanced search and filtering
- User presence indicators
- Message threads

### Technical Improvements
- GraphQL API
- Microservices architecture
- Event sourcing
- CQRS pattern
- Advanced caching strategies
- Real-time analytics

This architecture provides a solid foundation for a scalable, real-time chat application with room for future enhancements and feature additions.