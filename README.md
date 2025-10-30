# Chat Service - Multi-User Real-Time Chat Application

A comprehensive real-time chat application built with NestJS, TypeORM, MySQL, and Socket.IO. Features JWT authentication, WebSocket communication, image uploads, and message status tracking.

## 🚀 Features

- **Real-time messaging** with WebSocket connections
- **JWT authentication** for secure API access
- **Image uploads** with file storage and serving
- **Message status tracking** (sent, delivered, read)
- **Conversation management** (private and group chats)
- **User management** with external ID system
- **Typing indicators** and read receipts
- **Responsive web interface**

## 🏗️ Architecture

### Backend (NestJS)
- **Framework**: NestJS with TypeScript
- **Database**: MySQL with TypeORM
- **Authentication**: JWT with Passport
- **File Upload**: Multer for image handling
- **Real-time**: Socket.IO for WebSocket communication
- **Validation**: class-validator and class-transformer

### Frontend (Vanilla JS)
- **UI**: Responsive HTML/CSS/JavaScript
- **Real-time**: Socket.IO client
- **File Upload**: FormData API
- **Authentication**: JWT tokens

### Database Schema
- **Users**: External ID system for multi-app support
- **Conversations**: Many-to-many with participants
- **Messages**: Text and image support with status tracking
- **Conversation Participants**: Junction table for user-conversation relationships

## 📋 Prerequisites

- Node.js 18+
- MySQL 8.0+
- npm or yarn

## 🔧 Socket.IO Admin Dashboard

For real-time monitoring of socket connections and presence:

1. **Access the dashboard:**
   ```
   http://localhost:3001/presence-monitor
   ```

2. **Login credentials:**
   - Username: `admin` (configured via ADMIN_USERNAME env var)
   - Password: `admin123` (configured via ADMIN_PASSWORD env var)

3. **Features:**
   - Real-time socket connection monitoring
   - Active namespaces and rooms
   - Online users tracking
   - Recent events log
   - Connection statistics

## 🛠️ Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd chat-service
npm install
```

2. **Environment Setup:**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
PORT=3001
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASS=your_password
MYSQL_DB=chatdb
JWT_SHARED_SECRET=your_jwt_secret_here

# Socket.IO Admin UI Configuration (Optional)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

3. **Database Setup:**
```sql
CREATE DATABASE chatdb;
```

4. **Start the application:**
```bash
npm run start:dev
```

The application will be available at `http://localhost:3001`

## 🔐 Authentication

### JWT Token Generation
The application uses JWT tokens for authentication. Sample tokens are pre-generated for testing:

```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { sub: 'appA:user123', name: 'John Doe' },
  process.env.JWT_SHARED_SECRET,
  { expiresIn: '7d' }
);
```

### Available Test Users
- Alice (appA:alice)
- Bob (appA:bob)
- Charlie (appA:charlie)
- David (appA:david)
- Eve (appA:eve)

## 📡 API Documentation

See [API.md](API.md) for detailed endpoint documentation.

## 🎨 Frontend Usage

1. Open `http://localhost:3001` in your browser
2. Select a user from the sidebar
3. Click "New Chat" to start a conversation
4. Send text messages or upload images using the 📎 button
5. Messages appear in real-time for all participants

### Key Features:
- **Real-time updates**: Messages appear instantly
- **Image sharing**: Click 📎 to upload and share images
- **Read receipts**: See when messages are delivered and read
- **Typing indicators**: See when others are typing
- **Responsive design**: Works on desktop and mobile

## 🔧 Development

### Project Structure
```
chat-service/
├── src/
│   ├── app.controller.ts          # Main app controller
│   ├── app.module.ts              # Root application module
│   ├── app.service.ts             # Main app service
│   ├── main.ts                    # Application entry point
│   ├── auth/                      # Authentication module
│   │   ├── jwt.strategy.ts        # JWT strategy
│   │   ├── jwt.guard.ts          # JWT guard
│   │   └── ws-jwt.guard.ts       # WebSocket JWT guard
│   ├── entities/                  # Database entities
│   │   ├── user.entity.ts         # User entity
│   │   ├── conversation.entity.ts # Conversation entity
│   │   └── message.entity.ts      # Message entity
│   ├── conversations/             # Conversation management
│   ├── messages/                  # Message handling
│   │   ├── messages.controller.ts # REST endpoints
│   │   ├── messages.service.ts    # Business logic
│   │   ├── messages.gateway.ts    # WebSocket gateway
│   │   └── messages.module.ts     # Messages module
│   └── users/                     # User management
├── frontend/
│   └── index.html                 # Web interface
├── test/                          # Test files
└── uploads/                       # Uploaded files (created automatically)
```

### Key Technologies

- **NestJS**: Progressive Node.js framework
- **TypeORM**: TypeScript ORM for database operations
- **Socket.IO**: Real-time bidirectional communication
- **JWT**: JSON Web Tokens for authentication
- **Multer**: Middleware for handling file uploads
- **MySQL**: Relational database
- **class-validator**: Validation decorators

## 🚀 Deployment

1. **Build the application:**
```bash
npm run build
```

2. **Start in production:**
```bash
npm run start:prod
```

3. **Environment variables** must be set for production
4. **Database** should be configured and accessible
5. **File upload directory** (`/home/assets/chat/uploads`) must be writable

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
