# Understanding This Codebase

This document is written for someone seeing this repository for the first time. It explains how the system works as implemented in code today, not just how the existing README or API docs describe it.

The codebase is small enough to understand end-to-end, but there are a few places where the written docs, demo frontend, and runtime code do not fully agree. This guide calls those out directly so you can tell the difference between source-of-truth behavior and older or aspirational documentation.

## Phase 1: High-Level Architecture

### What this system is

This is a modular monolith built with NestJS.

It is not a microservice system. Everything runs inside one Node.js process:

- HTTP REST API
- WebSocket gateways
- file upload handling
- static asset serving
- Swagger generation
- database access through TypeORM

The repository also contains a very small frontend demo in `frontend/index.html`, but the backend is the real product surface.

### Architecture style

The backend follows a feature-module and service-layer structure:

- Controllers define REST endpoints.
- Gateways define Socket.IO events.
- Services hold most business logic.
- TypeORM repositories and entities define persistence.
- DTOs shape request and response contracts.

Within each feature, the common path is:

`controller or gateway -> service -> repository/query builder -> entity -> DTO/response`

### Runtime surfaces

The application exposes several surfaces:

- REST API under `/api/v1/*`
- Swagger UI under `/docs`
- Swagger JSON under `/docs-json`
- static assets under `/api/v1/assets/*`
- Socket.IO namespace on the default server path
- Socket.IO admin UI configured at `/admin`

### Backend vs frontend responsibilities

The backend is responsible for:

- bootstrapping NestJS
- authenticating JWTs
- creating and updating user records from token payloads
- managing conversations
- persisting messages
- tracking message delivery and read status
- handling uploads
- tracking online users in memory
- broadcasting real-time events

The frontend demo is responsible for:

- picking a hard-coded user
- opening a Socket.IO connection
- creating or retrieving a conversation
- fetching existing messages
- emitting new messages and typing events
- rendering a minimal chat UI

The frontend is not a framework app. It is a single HTML file with inline CSS and JavaScript.

### Startup flow

The application startup sequence is centered in [`src/main.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\main.ts) and [`src/app.module.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\app.module.ts).

#### What happens during startup

1. `dotenv.config()` is called in `src/main.ts`.
2. Nest creates a `NestExpressApplication` using `AppModule`.
3. CORS is enabled globally.
4. A global route prefix of `api/v1` is applied.
5. Static asset serving is registered.
6. Swagger/OpenAPI is generated and mounted at `/docs`.
7. The app listens on `process.env.PORT` or `3001`.

#### What `AppModule` wires together

`AppModule` imports:

- `ConfigModule.forRoot({ isGlobal: true })`
- `JwtModule.registerAsync(...)`
- `TypeOrmModule.forRoot(...)`
- `PassportModule.register({ defaultStrategy: 'jwt-chat' })`
- `UsersModule`
- `ConversationsModule`
- `PresenceModule`
- `MessagesModule`

This makes `AppModule` the dependency hub for the whole backend.

### Module dependency map

At a high level, the modules depend on each other like this:

- `AppModule`
  - imports `UsersModule`
  - imports `ConversationsModule`
  - imports `MessagesModule`
  - imports `PresenceModule`
  - provides `JwtStrategy`
  - provides `RoleAuthorizationService`
- `ConversationsModule`
  - depends on `UsersModule`
  - uses repositories for `Conversation`, `ConversationParticipant`, and `User`
- `MessagesModule`
  - depends on `ConversationsModule`
  - uses repositories for `Message`, `Conversation`, `ConversationParticipant`, and `User`
- `PresenceModule`
  - depends on `UsersModule`
- `UsersModule`
  - uses the `User` repository
  - also provides `PresenceGateway`, which is one of the confusing parts of this codebase

### Files to understand first

If you are onboarding quickly, start here:

1. [`src/main.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\main.ts)
2. [`src/app.module.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\app.module.ts)
3. [`src/auth/jwt.strategy.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\auth\jwt.strategy.ts)
4. [`src/conversations/conversations.service.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\conversations\conversations.service.ts)
5. [`src/messages/messages.service.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.service.ts)
6. [`src/messages/messages.gateway.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.gateway.ts)
7. [`src/presence/presence.gateway.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\presence\presence.gateway.ts)
8. [`src/messages/message.entity.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\message.entity.ts)

## Phase 2: Major Folders and What They Do

Each subsection below follows the same format:

- What it is
- Why it exists
- How it works
- Files involved
- Things to be careful about

### `src/`

#### What it is

The main backend source folder.

#### Why it exists

It contains all NestJS application code: bootstrap, feature modules, auth, entities, DTOs, config, and migrations.

#### How it works

Nest scans modules defined here, registers controllers and gateways, and uses decorators in this folder to build routes, providers, and database metadata.

#### Files involved

- `src/main.ts`
- `src/app.module.ts`
- `src/app.controller.ts`
- `src/app.service.ts`
- feature subfolders under `src/`

#### Things to be careful about

- Not every file under `src/` is equally current.
- There is a duplicate message entity shape in `src/entities/message.entity.ts` that is not the active runtime entity used by `AppModule`.

### `src/auth/`

#### What it is

Authentication-related code.

#### Why it exists

It secures REST routes and supports JWT-based identity resolution.

#### How it works

- `JwtAuthGuard` extends Nest Passport auth guard and uses the `jwt-chat` strategy.
- `JwtStrategy` validates bearer tokens and transforms JWT payloads into real `User` records.
- `WsJwtGuard` exists for WebSocket auth, but the active gateways do not use it.
- `RoleAuthorizationService` contains chat initiation rules based on `UserRole`.

#### Files involved

- [`src/auth/jwt.strategy.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\auth\jwt.strategy.ts)
- [`src/auth/jwt.guard.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\auth\jwt.guard.ts)
- [`src/auth/ws-jwt.guard.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\auth\ws-jwt.guard.ts)
- [`src/auth/role-authorization.service.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\auth\role-authorization.service.ts)

#### Things to be careful about

- JWT validation has a side effect: it upserts a database user every time a token is validated through the REST auth strategy.
- WebSocket auth is done manually inside gateways with `JwtService.verify()`, not through `WsJwtGuard`.
- The shared secret name used in runtime code is `JWT_SHARED_SECRET`, while `src/config/configuration.ts` also defines a `jwt.secret` setting based on `JWT_SECRET`. That config object is not the main source of truth for auth.

### `src/users/`

#### What it is

The user feature module.

#### Why it exists

It exposes read-oriented endpoints and provides user lookup/upsert logic used by auth and presence.

#### How it works

- `UsersController` exposes:
  - `GET /users/me`
  - `GET /users`
  - `GET /users/online`
- `UsersService` uses the `User` repository for:
  - upserting external users from JWT payloads
  - querying users except the current user
  - querying users by external IDs

#### Files involved

- [`src/users/users.module.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\users\users.module.ts)
- [`src/users/users.controller.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\users\users.controller.ts)
- [`src/users/users.service.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\users\users.service.ts)
- DTOs under `src/users/dto/`

#### Things to be careful about

- `findAllExcept` takes a numeric internal user ID even though its parameter name is `externalId`.
- `getOnlineUsers` depends on `PresenceGateway` state, which means “online user” status is in-memory, not database-backed.
- `UsersModule` also provides `PresenceGateway`, which overlaps with `PresenceModule` and makes provider ownership less obvious than it should be.

### `src/conversations/`

#### What it is

The conversation feature module.

#### Why it exists

It manages conversation creation and listing.

#### How it works

- `ConversationsController` exposes:
  - `POST /conversations/private/:otherUserId`
  - `GET /conversations`
- `ConversationsService`:
  - creates private conversations
  - prevents duplicate private conversations using a deterministic participant hash
  - checks role-based conversation initiation rules
  - loads conversations for a given user
  - verifies user membership for conversation lookup

#### Files involved

- [`src/conversations/conversations.module.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\conversations\conversations.module.ts)
- [`src/conversations/conversations.controller.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\conversations\conversations.controller.ts)
- [`src/conversations/conversations.service.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\conversations\conversations.service.ts)
- DTOs under `src/conversations/dto/`

#### Things to be careful about

- The route parameter is called `otherUserId` and the service treats it as an internal numeric user ID, not an external ID.
- Existing docs and the demo frontend suggest this endpoint uses an external ID, but the actual controller and service use a number.
- If the target user does not exist, `createPrivateConversation` creates a placeholder user using the numeric value converted to a string as `externalId` and `name`. That is surprising behavior if you expect strict user existence.

### `src/messages/`

#### What it is

The messaging feature module.

#### Why it exists

It handles message persistence, upload handling, WebSocket chat, typing events, and read receipts.

#### How it works

- `MessagesController` exposes:
  - `POST /messages/upload`
  - `POST /messages/:conversationId`
  - `GET /messages/:conversationId`
- `MessagesService` performs membership checks, writes messages, fetches paginated messages, updates delivery/read status, and resolves users by external ID.
- `MessagesGateway` authenticates socket connections, auto-joins conversation rooms, accepts chat events, and broadcasts updates.
- `MessagesModule` configures Multer disk storage and file validation.

#### Files involved

- [`src/messages/messages.module.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.module.ts)
- [`src/messages/messages.controller.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.controller.ts)
- [`src/messages/messages.service.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.service.ts)
- [`src/messages/messages.gateway.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.gateway.ts)
- [`src/messages/message.entity.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\message.entity.ts)
- DTOs under `src/messages/dto/`

#### Things to be careful about

- The active `Message` entity lives in `src/messages/message.entity.ts`, not under `src/entities/`.
- Delivery status changes are triggered from the gateway, not from a background delivery subsystem.
- `markMessagesAsRead` is intended to mark other users’ unread messages as `READ`, but the “return updated messages” query currently loads messages sent by the current user, which is conceptually different from the rows updated.
- The upload endpoint accepts more than images. It also accepts videos, audio, and document types.

### `src/presence/`

#### What it is

Presence and online-user tracking.

#### Why it exists

It keeps track of which users are currently connected over Socket.IO and exposes basic presence stats.

#### How it works

- `PresenceGateway` authenticates socket connections, stores online users in memory, emits `user_status_changed`, and exposes in-memory stats.
- `PresenceController` exposes:
  - `GET /presence/online-users`
  - `GET /presence/stats`
- `PresenceGateway.afterInit()` instruments the server for the Socket.IO Admin UI.

#### Files involved

- [`src/presence/presence.module.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\presence\presence.module.ts)
- [`src/presence/presence.gateway.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\presence\presence.gateway.ts)
- [`src/presence/presence.controller.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\presence\presence.controller.ts)

#### Things to be careful about

- Online users are stored only in a `Map` inside the gateway. They do not survive process restarts.
- Presence depends on socket authentication and a successful database lookup for the user’s external ID.
- Admin UI auth is disabled in code with `auth: false`, even though `.env.example` defines admin credentials.

### `src/entities/`

#### What it is

Primary TypeORM entity definitions for users and conversations, plus one legacy-looking message entity.

#### Why it exists

It holds core relational model definitions shared across feature modules.

#### How it works

- `User`, `Conversation`, and `ConversationParticipant` are used directly by `AppModule` and feature modules.
- `src/entities/message.entity.ts` defines an older message schema using `imageUrl` and `read`, but the runtime imports use `src/messages/message.entity.ts` instead.

#### Files involved

- [`src/entities/user.entity.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\entities\user.entity.ts)
- [`src/entities/conversation.entity.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\entities\conversation.entity.ts)
- [`src/entities/conversation-participant.entity.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\entities\conversation-participant.entity.ts)
- [`src/entities/message.entity.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\entities\message.entity.ts)

#### Things to be careful about

- Do not assume every entity under `src/entities/` is active runtime truth.
- The canonical message entity is the one imported in `AppModule`: [`src/messages/message.entity.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\message.entity.ts).

### `src/common/`

#### What it is

Shared DTOs and helper functions.

#### Why it exists

It avoids repeating pagination logic across modules.

#### How it works

- `PaginationDto` defines `page` and `limit`.
- `getPaginationResponse`, `getPaginatedData`, and `getPaginatedMeta` build paginated response envelopes.

#### Files involved

- [`src/common/dto/pagination.dto.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\common\dto\pagination.dto.ts)
- [`src/common/helper-functions/get-pagination-meta.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\common\helper-functions\get-pagination-meta.ts)

#### Things to be careful about

- The helper does not currently paginate the query correctly. It calls `getManyAndCount()` before applying `skip()` and `take()`. That means the metadata is computed, but the returned data is loaded before the pagination modifiers are applied.

### `src/config/`

#### What it is

Configuration helpers and TypeORM CLI data source setup.

#### Why it exists

It appears intended to centralize config and support migration commands.

#### How it works

- `configuration.ts` exports a config factory object with database, JWT, logging, and email settings.
- `data-source.ts` builds a TypeORM `DataSource` for migration commands.

#### Files involved

- [`src/config/configuration.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\config\configuration.ts)
- [`src/config/data-source.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\config\data-source.ts)

#### Things to be careful about

- `AppModule` does not use `configuration.ts` for `TypeOrmModule.forRoot(...)`. It reads environment variables directly.
- The runtime app uses `synchronize: true`, but the migration CLI data source uses `synchronize: false` and explicit migrations. Both mechanisms exist in the repo.
- `configuration.ts` contains settings like email config that are not used by the current feature modules.

### `src/migrations/`

#### What it is

TypeORM migration files.

#### Why it exists

They support schema changes when using the CLI migration path.

#### How it works

- `1763551079540-ConvertChatDbToUtf8mb45.ts` converts key tables to `utf8mb4`.
- `1764258518999-AddRoleToUser.ts` adds a `role` column to `users`.

#### Files involved

- [`src/migrations/1763551079540-ConvertChatDbToUtf8mb45.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\migrations\1763551079540-ConvertChatDbToUtf8mb45.ts)
- [`src/migrations/1764258518999-AddRoleToUser.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\migrations\1764258518999-AddRoleToUser.ts)

#### Things to be careful about

- Since runtime uses `synchronize: true`, schema changes may happen outside the migration path during normal app startup.
- The `AddRoleToUser` migration adds `role` as a plain varchar, while the active `User` entity defines `role` as an enum. That is another place where schema history and current entity intent can diverge.

### `frontend/`

#### What it is

A demo chat UI written as a single static HTML page.

#### Why it exists

It gives a quick manual way to exercise the chat system without building a separate frontend app.

#### How it works

The file:

- hard-codes JWTs for Alice and Bob
- opens a Socket.IO client
- calls REST endpoints with `fetch`
- renders messages directly in the DOM

#### Files involved

- [`frontend/index.html`](C:\Users\DEEPIJA\Downloads\chat-service\frontend\index.html)

#### Things to be careful about

- The demo is out of sync with current backend routing in several places.
- It sets `API_BASE = 'http://localhost:3001'`, but the backend uses a global prefix of `/api/v1`.
- It assumes `/conversations/private/:externalId`, while the controller expects a numeric `otherUserId`.
- It expects non-paginated message arrays, while the backend message list returns a paginated envelope.
- It calls user endpoints before a user has been selected, so the Authorization header can be malformed early in startup.
- The user buttons are queried via `data-user` attributes that are not actually present in the HTML.

### `scripts/`

#### What it is

Utility scripts outside the main app runtime.

#### Why it exists

It supports syncing the generated OpenAPI spec to Postman.

#### How it works

`sync-postman.js`:

- fetches Swagger JSON from `/docs-json`
- converts it using `openapi-to-postmanv2`
- uses the Postman API to create or update a collection

#### Files involved

- [`scripts/sync-postman.js`](C:\Users\DEEPIJA\Downloads\chat-service\scripts\sync-postman.js)

#### Things to be careful about

- This script depends on external environment variables like `POSTMAN_API_KEY` and `POSTMAN_WORKSPACE_ID`.
- It is not part of request handling or runtime chat behavior.

### `test/`

#### What it is

Automated test configuration and E2E tests.

#### Why it exists

It provides a starting point for backend test coverage.

#### How it works

- `app.e2e-spec.ts` spins up `AppModule` and tests `GET /`.
- `jest-e2e.json` configures the E2E test runner.

#### Files involved

- [`test/app.e2e-spec.ts`](C:\Users\DEEPIJA\Downloads\chat-service\test\app.e2e-spec.ts)
- [`test/jest-e2e.json`](C:\Users\DEEPIJA\Downloads\chat-service\test\jest-e2e.json)

#### Things to be careful about

- Current automated coverage is minimal.
- The test still expects the root endpoint to return `'Hello World!'`, while `AppController` documents the route as “Chat API is running!” in Swagger metadata.

### `dist/`

#### What it is

Compiled build output.

#### Why it exists

It supports production startup through `node dist/main` and migration execution against built code.

#### How it works

TypeScript compiles source into this folder during `npm run build`.

#### Files involved

- generated build artifacts only

#### Things to be careful about

- `dist/` is not the source of truth for understanding the system.
- Treat it as generated output unless you are debugging a build/runtime packaging issue.

## Phase 3: Core Building Blocks

This section explains the main classes and how they depend on each other.

### `JwtStrategy`

File: [`src/auth/jwt.strategy.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\auth\jwt.strategy.ts)

#### What it is

Passport JWT strategy registered under the name `jwt-chat`.

#### Why it exists

It turns a bearer token into a real application user for REST requests.

#### How it works

- Reads JWT from `Authorization: Bearer ...`
- verifies it with `JWT_SHARED_SECRET`
- calls `UsersService.upsertExternalUser(...)`
- returns the resulting `User`

That returned user becomes `req.user` inside guarded controllers.

#### Direct dependencies

- `UsersService`
- `passport-jwt`

#### Data in

JWT payload, expected to include at least:

- `sub`
- `name`
- optionally `avatarUrl`
- optionally `role`

#### Data out

A persisted `User` entity instance.

#### Side effects

- Creates a user if one does not exist yet
- Updates an existing user’s name, avatar, and role if present in the token

#### Look next

- [`src/users/users.service.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\users\users.service.ts)
- [`src/auth/jwt.guard.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\auth\jwt.guard.ts)

### `JwtAuthGuard`

File: [`src/auth/jwt.guard.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\auth\jwt.guard.ts)

#### What it is

A thin Nest auth guard wrapper around the `jwt-chat` strategy.

#### Why it exists

It lets controllers declare `@UseGuards(JwtAuthGuard)`.

#### How it works

It inherits all real behavior from Passport and `JwtStrategy`.

#### Things to be careful about

- This is the active REST auth mechanism.
- If a controller uses this guard, JWT validation can create or update a user record.

### `WsJwtGuard`

File: [`src/auth/ws-jwt.guard.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\auth\ws-jwt.guard.ts)

#### What it is

A WebSocket guard that manually verifies a token from the socket handshake.

#### Why it exists

It appears intended for socket authentication.

#### How it works

It reads:

- `client.handshake.auth.token`, or
- `Authorization` from handshake headers

Then it verifies the JWT and attaches a small user object to `client.data.user`.

#### Things to be careful about

- It is currently not used by the active gateways.
- The actual gateways authenticate manually in their own `handleConnection(...)` methods instead.

### `UsersController` and `UsersService`

Files:

- [`src/users/users.controller.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\users\users.controller.ts)
- [`src/users/users.service.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\users\users.service.ts)

#### What they are

The read API and business logic for users.

#### Why they exist

They support:

- “Who am I?”
- listing other users
- listing online users
- looking up or upserting users for auth and presence

#### How they work

`UsersController.getMe()` returns `req.user` as resolved by JWT auth.

`UsersController.getAllUsers()`:

- reads the current user from `req.user`
- passes `currentUser.id` to `UsersService.findAllExcept(...)`
- returns a paginated response envelope

`UsersController.getOnlineUsers()`:

- reads external IDs from `PresenceGateway.getOnlineUserIds()`
- asks `UsersService.findByExternalIds(...)` to load user rows

`UsersService.upsertExternalUser(...)` is a key cross-cutting function used by auth.

#### Direct dependencies

`UsersController` depends on:

- `UsersService`
- `PresenceGateway`

`UsersService` depends on:

- `Repository<User>`

#### Data transformations

- `findAllExcept(...)` returns only selected fields: `id`, `externalId`, `name`
- `findByExternalIds(...)` also selects a subset of fields

#### Things to be careful about

- These methods return paginated envelopes, not plain arrays, when pagination helpers are used.
- “Online user” identity is resolved via external IDs stored in memory by the presence gateway.

### `ConversationsController` and `ConversationsService`

Files:

- [`src/conversations/conversations.controller.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\conversations\conversations.controller.ts)
- [`src/conversations/conversations.service.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\conversations\conversations.service.ts)

#### What they are

The conversation API and core conversation business logic.

#### Why they exist

They create private chats and list a user’s existing conversations.

#### How they work

`createPrivateConversation(...)`:

- loads the target user by internal numeric ID
- creates a placeholder user if missing
- searches for an existing private conversation between both users
- enforces role-based initiation rules
- computes a deterministic `participantIdsHash`
- creates the conversation row
- creates two participant rows
- reloads the conversation with participants and users

`getUserConversations(...)`:

- starts from the `ConversationParticipant` table
- joins conversations and all their participants
- filters by current user membership
- orders by `conversation.updatedAt DESC`
- maps the nested entity graph into a simpler response object

#### Direct dependencies

- `Repository<Conversation>`
- `Repository<ConversationParticipant>`
- `Repository<User>`
- `UsersService`
- `RoleAuthorizationService`

#### Data transformations

Conversation rows are transformed into plain response objects with:

- `id`
- `type`
- `participants`
- `createdAt`
- `updatedAt`

#### Things to be careful about

- The service contains the real deduplication logic for private conversations.
- Membership is enforced by querying participant rows, not by trusting client input.
- Role restrictions apply only when initiating a new conversation.

### `MessagesController`, `MessagesService`, and `MessagesGateway`

Files:

- [`src/messages/messages.controller.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.controller.ts)
- [`src/messages/messages.service.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.service.ts)
- [`src/messages/messages.gateway.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.gateway.ts)

#### What they are

The REST and real-time messaging stack.

#### Why they exist

They provide:

- file upload
- message send
- message retrieval
- room-based broadcast
- typing indicators
- read receipts

#### How they work

`MessagesController.uploadFile()`:

- accepts a Multer-uploaded file
- infers media type from MIME type
- returns a URL under `/api/v1/assets/chat/uploads/...`

`MessagesController.send()`:

- calls `MessagesService.sendMessage(...)`
- emits `new_message` to the conversation room through `MessagesGateway.server`
- returns the saved message DTO

`MessagesController.list()`:

- checks auth through the controller guard
- passes control to `MessagesService.getMessages(...)`

`MessagesGateway.handleConnection()`:

- reads token from `socket.handshake.auth.token`
- verifies it with `JwtService`
- resolves the user by external ID
- loads all conversations for the user
- auto-joins `conversation:{id}` rooms

`MessagesGateway.handleMessage()`:

- resolves current user from `socket.data.user`
- persists the message through the service
- marks the new message as delivered
- broadcasts `new_message`

`MessagesGateway.handleMarkAsRead()`:

- marks relevant messages as read
- emits `messages_read`

#### Direct dependencies

`MessagesController` depends on:

- `MessagesService`
- `MessagesGateway`

`MessagesService` depends on:

- `Repository<Message>`
- `Repository<Conversation>`
- `Repository<User>`

`MessagesGateway` depends on:

- `MessagesService`
- `ConversationsService`
- `JwtService`

#### Data transformations

The service returns `MessageResponseDto`, which converts database entities into:

- `id`
- `content`
- `mediaUrl`
- `mediaType`
- `senderName`
- `sentByMe`
- `status`
- `createdAt`
- `conversationId`

#### Things to be careful about

- REST send and WebSocket send share the same service method.
- WebSocket send adds delivery-state side effects and room broadcast that REST send does not perform by itself.
- The gateway sends to the room and also emits to the sender socket directly.

### `PresenceController` and `PresenceGateway`

Files:

- [`src/presence/presence.controller.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\presence\presence.controller.ts)
- [`src/presence/presence.gateway.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\presence\presence.gateway.ts)

#### What they are

The in-memory presence subsystem.

#### Why they exist

They provide online/offline user visibility and socket monitoring hooks.

#### How they work

`PresenceGateway.handleConnection()`:

- verifies the JWT
- finds the user by external ID
- stores `socket.id -> externalId` in `onlineUsers`
- logs an event in memory
- emits `user_status_changed`

`PresenceGateway.handleDisconnect()`:

- removes the socket from the map
- emits offline status
- appends to the in-memory event log

`PresenceController` exposes inspection endpoints using those in-memory structures.

#### Direct dependencies

- `JwtService`
- `UsersService`
- internal `Map<string, string>`

#### Things to be careful about

- This is process-local presence only.
- Multiple server instances would each have separate presence state unless an external adapter is added.

### `RoleAuthorizationService`

File: [`src/auth/role-authorization.service.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\auth\role-authorization.service.ts)

#### What it is

A simple authorization rules service for starting conversations.

#### Why it exists

It centralizes role hierarchy rules instead of hard-coding them into `ConversationsService`.

#### How it works

`canInitiateConversation(...)` enforces:

- `bishop` can initiate with anyone
- `deanery` can initiate only with `parish`
- `parish` can initiate only with `parishioner`
- `parishioner` cannot initiate

`getForbiddenMessage(...)` returns human-readable explanations when initiation is denied.

#### Things to be careful about

- This service only protects conversation creation.
- It does not block replying inside an existing conversation.

### Entities

#### `User`

File: [`src/entities/user.entity.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\entities\user.entity.ts)

What it is:

- primary user table mapping

Why it exists:

- stores application-facing users resolved from external JWT identities

How it works:

- fields: `id`, `externalId`, `name`, `avatarUrl`, `role`, `createdAt`
- `externalId` is unique

Things to be careful about:

- this system distinguishes internal numeric IDs from external JWT IDs

#### `Conversation`

File: [`src/entities/conversation.entity.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\entities\conversation.entity.ts)

What it is:

- root conversation record

Why it exists:

- groups participants and messages

How it works:

- fields: `id`, `type`, `participantIdsHash`, `participants`, `createdAt`, `updatedAt`
- unique index on `participantIdsHash`

Things to be careful about:

- `participantIdsHash` is important for private-chat deduplication

#### `ConversationParticipant`

File: [`src/entities/conversation-participant.entity.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\entities\conversation-participant.entity.ts)

What it is:

- join table entity between conversations and users

Why it exists:

- models membership and participant role

How it works:

- many-to-one to conversation
- many-to-one to user
- stores `role`
- stores `joinedAt`

Things to be careful about:

- membership checks throughout the system are done through this table

#### `Message`

Canonical file: [`src/messages/message.entity.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\message.entity.ts)

What it is:

- active message table mapping

Why it exists:

- stores text and media messages with status tracking

How it works:

- fields: `id`, `conversation`, `sender`, `content`, `mediaUrl`, `mediaType`, `status`, `createdAt`
- `sender` is eagerly loaded
- status enum: `sent`, `delivered`, `read`

Things to be careful about:

- do not confuse this with the older `src/entities/message.entity.ts` shape using `imageUrl` and `read`

### Shared pagination DTO/helper

Files:

- [`src/common/dto/pagination.dto.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\common\dto\pagination.dto.ts)
- [`src/common/helper-functions/get-pagination-meta.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\common\helper-functions\get-pagination-meta.ts)

#### What they are

Shared pagination primitives.

#### Why they exist

They standardize paginated responses across users, conversations, and messages.

#### How they work

The intended response shape is:

```ts
{
  data: T[],
  meta: {
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev,
    from,
    to
  }
}
```

#### Things to be careful about

- The helper computes the meta shape correctly in principle.
- The actual query pagination order is wrong because `getManyAndCount()` is called before `skip/take()` are applied.

## Phase 4: Key Workflows

This section traces the most important end-to-end paths.

### Workflow: App startup and route registration

#### Where the request starts

Process startup begins in [`src/main.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\main.ts).

#### Files and functions involved

- `bootstrap()` in `src/main.ts`
- `AppModule` in `src/app.module.ts`
- imported modules and controllers throughout `src/`

#### Step-by-step

1. `dotenv.config()` loads environment variables.
2. `NestFactory.create(AppModule)` creates the application.
3. `app.enableCors()` turns on CORS.
4. `app.setGlobalPrefix('api/v1')` prefixes REST routes.
5. `app.useStaticAssets(...)` exposes files from `ASSETS_PATH` or `/home/assets`.
6. Swagger document creation scans registered controllers and DTO decorators.
7. `app.listen(...)` starts the server.

#### Final output

- HTTP server is live
- REST routes are available
- WebSocket gateways are initialized
- static assets are available
- Swagger docs are exposed

### Workflow: Authenticated REST request lifecycle

#### Where the request starts

At any controller route using `@UseGuards(JwtAuthGuard)`.

Examples:

- `UsersController.getMe()`
- `UsersController.getAllUsers()`
- `ConversationsController`
- `MessagesController`

#### Files and functions involved

- [`src/auth/jwt.guard.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\auth\jwt.guard.ts)
- [`src/auth/jwt.strategy.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\auth\jwt.strategy.ts)
- [`src/users/users.service.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\users\users.service.ts)

#### Step-by-step

1. Request arrives with `Authorization: Bearer <token>`.
2. `JwtAuthGuard` invokes the `jwt-chat` strategy.
3. `JwtStrategy.validate(payload)` is called.
4. `UsersService.upsertExternalUser(...)` creates or updates a DB user.
5. The resolved user becomes `req.user`.
6. Controller handler runs with an authenticated `User`.

#### Final output

The controller returns business data, but auth may also have modified the user table as a side effect.

### Workflow: JWT login and user materialization

This system does not implement a login endpoint of its own. It expects JWTs to already exist.

#### Where the request starts

A REST call or socket connection presents a JWT.

#### Files and functions involved

- `JwtStrategy.validate(...)`
- `UsersService.upsertExternalUser(...)`
- `PresenceGateway.handleConnection(...)`
- `MessagesGateway.handleConnection(...)`

#### Step-by-step

1. A token with `sub` and `name` is presented.
2. REST auth path:
   - `JwtStrategy` verifies token
   - `UsersService.upsertExternalUser(...)` syncs user data into the DB
3. WebSocket auth path:
   - gateways call `JwtService.verify(token)` directly
   - gateway then looks up the user by `externalId`

#### Final output

- REST path guarantees a user row exists or is updated.
- WebSocket path assumes the user already exists in the database.

#### Important implication

A socket connection may fail for a valid token if no prior REST-authenticated path has created the user record yet.

### Workflow: Private conversation creation

#### Where the request starts

`POST /api/v1/conversations/private/:otherUserId`

Controller: [`ConversationsController.createPrivateConversation()`](C:\Users\DEEPIJA\Downloads\chat-service\src\conversations\conversations.controller.ts)

#### Files and functions involved

- `ConversationsController.createPrivateConversation(...)`
- `ConversationsService.createPrivateConversation(...)`
- `RoleAuthorizationService.canInitiateConversation(...)`
- `Conversation` and `ConversationParticipant` repositories

#### Step-by-step

1. Controller reads `req.user` and route param `otherUserId`.
2. Service tries to load the target user by internal numeric ID.
3. If missing, service creates a placeholder user.
4. Service queries for an existing private conversation joining both participant rows.
5. If one exists, it reloads and returns it.
6. If not, service checks role authorization.
7. Service sorts participant IDs and builds `participantIdsHash`.
8. Service inserts a new `Conversation`.
9. Service inserts two `ConversationParticipant` rows.
10. Service reloads the conversation with participant relations.
11. Controller maps the entity to a response object.

#### How data is transformed

- route param string -> numeric user ID concept
- conversation entity graph -> flattened JSON response with participant summaries

#### Final output

A conversation object containing:

- `id`
- `participants`
- `createdAt`

### Workflow: Message send via REST

#### Where the request starts

`POST /api/v1/messages/:conversationId`

Controller: [`MessagesController.send()`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.controller.ts)

#### Files and functions involved

- `MessagesController.send(...)`
- `MessagesService.sendMessage(...)`
- `MessagesGateway.server.to(...).emit(...)`

#### Step-by-step

1. Controller reads `conversationId`, body, and `req.user`.
2. Service checks whether the user is a participant in the conversation.
3. Service loads the conversation entity.
4. Service creates a `Message` entity with status `sent`.
5. Service saves the message.
6. Service returns `MessageResponseDto`.
7. Controller emits `new_message` to the conversation room.
8. Controller returns the DTO to the HTTP client.

#### Final output

- message row persisted
- room broadcast emitted
- HTTP response returned

### Workflow: Message send via WebSocket

#### Where the request starts

Socket event: `send_message`

Gateway: [`MessagesGateway.handleMessage()`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.gateway.ts)

#### Files and functions involved

- `MessagesGateway.handleConnection(...)`
- `MessagesGateway.handleMessage(...)`
- `MessagesService.findUserByExternalId(...)`
- `MessagesService.sendMessage(...)`
- `MessagesService.markMessageAsDelivered(...)`

#### Step-by-step

1. Client connects with token in `socket.handshake.auth.token`.
2. Gateway verifies the token.
3. Gateway looks up the user by external ID.
4. Gateway loads all conversations for the user and auto-joins the corresponding rooms.
5. Client emits `send_message` with `conversationId`, `content`, `mediaUrl`, `mediaType`.
6. Gateway resolves the full `User`.
7. Gateway calls `MessagesService.sendMessage(...)`.
8. Gateway marks that message as delivered.
9. Gateway clones the DTO and changes `status` to `'delivered'`.
10. Gateway emits `new_message` to the room.
11. Gateway also emits `new_message` back to the sender socket.

#### Final output

- message row saved
- delivery status updated
- room and sender receive `new_message`

### Workflow: Message retrieval with pagination

#### Where the request starts

`GET /api/v1/messages/:conversationId`

Controller: [`MessagesController.list()`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.controller.ts)

#### Files and functions involved

- `MessagesController.list(...)`
- `MessagesService.getMessages(...)`
- `getPaginatedData(...)`
- `getPaginationResponse(...)`

#### Step-by-step

1. Controller receives `conversationId`, `req.user`, and `PaginationDto`.
2. Service checks conversation membership through a joined query.
3. Service builds a query for messages joined with sender.
4. Query orders messages by `createdAt DESC`.
5. Pagination helper loads results and count.
6. Service maps results to `MessageResponseDto`.
7. Helper wraps the mapped array in `{ data, meta }`.

#### Final output

A paginated response envelope.

#### Important caveat

Because of the helper bug, the data set is loaded before `skip/take` is applied. The response shape looks paginated, but the loaded data does not reflect correct pagination behavior.

### Workflow: Marking messages as read

#### Where the request starts

Socket event: `mark_as_read`

Gateway: [`MessagesGateway.handleMarkAsRead()`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.gateway.ts)

#### Files and functions involved

- `MessagesGateway.handleMarkAsRead(...)`
- `MessagesService.markMessagesAsRead(...)`

#### Step-by-step

1. Gateway reads current user payload from `socket.data.user`.
2. Gateway resolves the full `User` by external ID.
3. Service verifies the user is a participant in the conversation.
4. Service issues an update query setting `status = READ` for matching rows not sent by the current user.
5. Service loads a set of messages for return.
6. Gateway emits `messages_read` to the room.
7. Gateway also emits `messages_read` to the sender socket.

#### Final output

Participants in the room receive a read-status event.

#### Important caveat

The rows loaded for broadcasting are queried as messages sent by the current user, which does not obviously match the set of rows that were updated. This is a source of conceptual confusion when reading the code.

### Workflow: Presence connection and online status tracking

#### Where the request starts

Socket connection to the presence gateway.

Gateway: [`PresenceGateway.handleConnection()`](C:\Users\DEEPIJA\Downloads\chat-service\src\presence\presence.gateway.ts)

#### Files and functions involved

- `PresenceGateway.afterInit(...)`
- `PresenceGateway.handleConnection(...)`
- `PresenceGateway.handleDisconnect(...)`
- `UsersService.findByExternalId(...)`

#### Step-by-step

1. Socket connects with a JWT token.
2. Gateway verifies the token.
3. Gateway looks up the database user by `payload.sub`.
4. Gateway stores `socket.id -> user.externalId` in `onlineUsers`.
5. Gateway logs an event to `eventLog`.
6. Gateway emits `user_status_changed` with status `online`.
7. On disconnect, the mapping is removed and an offline event is emitted.

#### Final output

- in-memory online-user map updated
- live presence event emitted
- controller endpoints can now report online users and stats

### Workflow: File upload and asset URL generation

#### Where the request starts

`POST /api/v1/messages/upload`

Files:

- [`src/messages/messages.module.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.module.ts)
- [`src/messages/messages.controller.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.controller.ts)

#### Step-by-step

1. Multer intercepts the multipart request.
2. Storage destination callback chooses `UPLOAD_PATH` or `/home/assets/chat/uploads`.
3. If necessary, the upload directory is created recursively.
4. File filter checks MIME type against an allowlist.
5. File is stored with a generated filename.
6. Controller infers `mediaType` from MIME type.
7. Controller returns a URL under `/api/v1/assets/chat/uploads/<filename>`.

#### Final output

The file is stored on disk and the client receives:

```json
{
  "url": "/api/v1/assets/chat/uploads/<filename>",
  "mediaType": "image | video | audio | document"
}
```

### Workflow: Frontend demo path

#### Where the request starts

User opens [`frontend/index.html`](C:\Users\DEEPIJA\Downloads\chat-service\frontend\index.html) and clicks Alice or Bob.

#### Files and functions involved

- `selectUser(...)`
- `connectWebSocket()`
- `createConversation()`
- `loadMessages()`
- `sendMessage()`
- `handleTyping()`

#### Step-by-step

1. User chooses Alice or Bob.
2. Demo updates UI state and enables input.
3. Demo opens a Socket.IO connection using a hard-coded token.
4. Demo attempts to create a conversation through REST.
5. Demo attempts to load existing messages.
6. On input, the demo emits typing events.
7. On send, the demo emits `send_message`.
8. On `new_message`, the demo appends a message to the DOM.

#### Important caveat

The demo flow is conceptually aligned with the backend, but the exact URLs and response-shape assumptions are partly out of sync with current backend code.

## Phase 5: Data Layer

### What the database model looks like from code

From the active entities, the main relational model is:

- `users`
- `conversations`
- `conversation_participants`
- `messages`

### Important model relationships

#### `users`

Represents application users keyed by both:

- internal primary key `id`
- external unique identity `externalId`

This distinction matters everywhere.

#### `conversations`

Represents chat threads.

Important fields:

- `type`
- `participantIdsHash`
- timestamps

#### `conversation_participants`

Represents many-to-many membership between users and conversations, plus participant role.

This table is central to authorization and query scoping:

- listing user conversations
- checking message send eligibility
- checking message read eligibility

#### `messages`

Represents chat content with:

- optional text
- optional media URL
- media type
- sender reference
- delivery/read status
- creation timestamp

### Why `participantIdsHash` exists

The `Conversation` entity has a unique index on `participantIdsHash`.

`ConversationsService.generateParticipantIdsHash(...)`:

- sorts participant IDs
- joins them into a comma-separated string

This gives a deterministic identity for a private conversation between a fixed set of users. For two users, the conversation hash will be the same regardless of ordering, which helps prevent duplicate private conversations.

### Where business logic touches the database

#### User writes

- `UsersService.upsertExternalUser(...)`
- `ConversationsService.createPrivateConversation(...)` can create placeholder users

#### Conversation reads/writes

- `ConversationsService.createPrivateConversation(...)`
- `ConversationsService.getUserConversations(...)`
- `ConversationsService.getConversationById(...)`

#### Message reads/writes

- `MessagesService.sendMessage(...)`
- `MessagesService.getMessages(...)`
- `MessagesService.markMessagesAsRead(...)`
- `MessagesService.markMessageAsDelivered(...)`

### Query-builder patterns used

The code relies heavily on `createQueryBuilder(...)` for:

- membership checks
- multi-table joins
- filtering by participant or sender
- ordering conversations and messages
- update queries for message status

This is one of the main reusable patterns in the codebase. When behavior feels “magic,” it is usually hiding inside a query-builder chain rather than inside a repository shortcut.

### How pagination is intended to work vs what it actually does

#### Intended design

Controllers accept `PaginationDto` and services wrap results in:

```ts
{
  data: [...],
  meta: {...}
}
```

#### Actual behavior

`getPaginatedData(...)` currently does:

1. `qb.getManyAndCount()`
2. reads `page` and `limit`
3. calls `qb.skip(...).take(...)`
4. returns the data already loaded in step 1

So the metadata path exists, but the record slicing is not applied before fetching.

### `synchronize: true` vs migrations

This repo uses both schema strategies:

- runtime app setup in `AppModule` uses `synchronize: true`
- CLI data source in `src/config/data-source.ts` uses `synchronize: false` and explicit migrations

What this means for a new developer:

- normal app startup may change the schema automatically based on current entities
- migration commands use compiled files and the separate data source config
- schema state may drift if developers rely on both paths inconsistently

## Phase 6: Conventions, Patterns, and Hidden Complexity

### Naming and structure conventions

- Nest feature folders are named by domain: `users`, `conversations`, `messages`, `presence`
- controllers end with `.controller.ts`
- services end with `.service.ts`
- modules end with `.module.ts`
- DTOs live in `dto/`
- entity files define TypeORM decorators and table mappings

### Architectural patterns in use

- modular monolith
- feature modules
- controller/service split
- repository/entity persistence
- DTO-based response shaping
- gateway/service split for real-time behavior
- authorization by membership query rather than by a separate policy layer

### Reusable patterns to recognize

#### Pattern: JWT creates app users

REST auth does more than authenticate. It also creates or updates user records.

#### Pattern: membership is checked through joins

Before conversation or message access is granted, the code queries joined participant tables instead of trusting IDs from the client.

#### Pattern: response DTOs flatten entity graphs

Services often save full entities and then map them to simpler DTOs such as `MessageResponseDto`.

#### Pattern: in-memory runtime state

Presence is stored in gateway memory, not in the database.

### Hidden complexity and “if you don’t know this, you’ll be confused”

#### Docs and implementation drift

The existing `README.md`, `API.md`, and `frontend/index.html` do not fully match the current backend implementation.

Examples:

- docs imply some routes exist that do not
- frontend omits `/api/v1` prefix
- conversation route parameter semantics do not match the frontend example
- message list handling in the frontend assumes a raw array

#### Duplicate message entity

There are two message entity files:

- legacy-looking: [`src/entities/message.entity.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\entities\message.entity.ts)
- active: [`src/messages/message.entity.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\message.entity.ts)

Only the second one is used by `AppModule`.

#### Provider wiring is non-obvious

`PresenceGateway` is provided/exported by both:

- [`src/users/users.module.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\users\users.module.ts)
- [`src/presence/presence.module.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\presence\presence.module.ts)

That makes module ownership of presence less clear than the folder structure suggests.

#### WebSocket auth path is manual

Although `WsJwtGuard` exists, the gateways do not use it. They manually verify tokens in `handleConnection(...)`.

#### Presence state is global process memory

`PresenceGateway` uses:

```ts
private onlineUsers = new Map<string, string>();
private eventLog: any[] = [];
```

That means:

- restarts clear presence
- multiple instances would not share presence
- controller presence endpoints only report local-process state

#### Side effects in auth

A plain `GET /users/me` can create or update a user row because the side effect lives in JWT validation.

#### Admin UI config is misleading

`README.md` mentions admin credentials, but `PresenceGateway.afterInit()` configures the Socket.IO Admin UI with `auth: false`.

### Global state and implicit dependencies

- environment variables drive port, DB connection, JWT secret, upload paths, and asset paths
- `req.user` depends on auth guard behavior
- `socket.data.user` depends on manual gateway auth
- presence endpoints depend on gateway memory
- WebSocket auto-room join depends on `ConversationsService.getUserConversations(...)`

## Phase 7: External Integrations and Runtime Surfaces

### MySQL via TypeORM

The primary external system is MySQL.

Relevant files:

- [`src/app.module.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\app.module.ts)
- [`src/config/data-source.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\config\data-source.ts)

The app uses TypeORM repositories and query builders throughout the feature services.

### Swagger/OpenAPI

Swagger is generated during bootstrap using:

- `DocumentBuilder`
- `SwaggerModule.createDocument(...)`
- `SwaggerModule.setup('docs', app, document)`

Relevant file:

- [`src/main.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\main.ts)

This is the basis for the Postman sync script.

### Postman integration

The repository includes [`scripts/sync-postman.js`](C:\Users\DEEPIJA\Downloads\chat-service\scripts\sync-postman.js), which:

- fetches `/docs-json`
- converts OpenAPI to Postman collection format
- creates or updates a Postman collection through the Postman API

This is an external developer-tooling integration, not a runtime request path.

### Socket.IO Admin UI

`PresenceGateway.afterInit()` calls `instrument(server, ...)` from `@socket.io/admin-ui`.

Relevant file:

- [`src/presence/presence.gateway.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\presence\presence.gateway.ts)

This provides a monitoring/admin surface for socket activity.

### Static file storage

Uploads use:

- `UPLOAD_PATH` for where files are stored
- `ASSETS_PATH` for where static files are served from

Relevant files:

- [`src/messages/messages.module.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.module.ts)
- [`src/main.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\main.ts)
- [`.env.example`](C:\Users\DEEPIJA\Downloads\chat-service\.env.example)

Important detail:

- the upload write path defaults to `/home/assets/chat/uploads`
- the static serving root defaults to `/home/assets`

That means the URL `/api/v1/assets/chat/uploads/<file>` works because the upload subdirectory sits under the static asset root.

### Queues, cron jobs, and webhooks

Based on a targeted source search, the current codebase does not implement:

- cron jobs
- scheduled tasks
- queue consumers/producers
- webhook controllers or handlers

If you are looking for background processing, it is not present in the current source tree.

## Phase 8: Questions a New Developer Will Ask

### Where does authentication actually happen?

REST authentication happens through `JwtAuthGuard` and `JwtStrategy`.

Files:

- [`src/auth/jwt.guard.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\auth\jwt.guard.ts)
- [`src/auth/jwt.strategy.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\auth\jwt.strategy.ts)

WebSocket authentication happens manually inside:

- [`src/messages/messages.gateway.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.gateway.ts)
- [`src/presence/presence.gateway.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\presence\presence.gateway.ts)

### Why does a JWT create or update a user record?

Because `JwtStrategy.validate(payload)` calls `UsersService.upsertExternalUser(...)`.

This codebase treats the JWT as the source of identity truth and materializes that identity into the local user table when a REST-authenticated request arrives.

### How does the app know which conversations a socket joins?

`MessagesGateway.handleConnection()`:

1. verifies the token
2. resolves the user by external ID
3. calls `ConversationsService.getUserConversations(user)`
4. joins `conversation:{id}` for each returned conversation

### Where are online users stored?

In memory, inside `PresenceGateway`:

- `onlineUsers: Map<string, string>`
- keyed by `socket.id`
- value is `externalId`

They are not stored in the database.

### What is the canonical message entity file?

The active one is:

- [`src/messages/message.entity.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\message.entity.ts)

The one under `src/entities/` looks like an older version and is not imported by `AppModule`.

### Are migrations or `synchronize` the source of truth?

At runtime, `AppModule` uses `synchronize: true`, so current entity definitions can drive schema changes automatically.

For CLI migration commands, `src/config/data-source.ts` uses explicit migrations.

So the honest answer is: both exist, and a new developer needs to know that runtime schema behavior and migration history can diverge.

### Why do the included docs and frontend not fully match runtime behavior?

Because the code has evolved, and some supporting docs/demo code were not updated to match every change.

Examples include:

- route prefixes
- conversation route parameter expectations
- response shape assumptions
- upload details

When in doubt, trust the source files under `src/`.

### How are private conversations deduplicated?

By computing a deterministic `participantIdsHash` from sorted user IDs and placing a unique index on that field in the `Conversation` entity.

The service also performs an explicit join query to find existing private conversations before creating a new one.

### Where are uploads stored and how are they served?

Stored at:

- `UPLOAD_PATH`, or
- `/home/assets/chat/uploads`

Served from:

- `ASSETS_PATH`, or
- `/home/assets`

Exposed to clients under:

- `/api/v1/assets/chat/uploads/<filename>`

### What files should I read first?

Start with these in order:

1. [`src/main.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\main.ts)
2. [`src/app.module.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\app.module.ts)
3. [`src/auth/jwt.strategy.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\auth\jwt.strategy.ts)
4. [`src/users/users.service.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\users\users.service.ts)
5. [`src/conversations/conversations.service.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\conversations\conversations.service.ts)
6. [`src/messages/messages.service.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.service.ts)
7. [`src/messages/messages.gateway.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.gateway.ts)
8. [`src/presence/presence.gateway.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\presence\presence.gateway.ts)

## Verification Notes

This document was written against the source code in `src/`, not just against existing docs.

Verification performed during analysis:

- scanned controllers, services, gateways, modules, entities, DTOs, config, migrations, scripts, frontend, and tests
- cross-checked repo docs against implementation
- confirmed no active cron, queue, or webhook code in `src/`
- confirmed the duplicate message entity shape and identified the active runtime import path

When repo docs and source code disagreed, this document treated source code as authoritative.
