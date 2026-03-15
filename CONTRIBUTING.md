# Contributing

Thanks for contributing.

## Local Workflow

1. Install dependencies:

```bash
npm install
```

2. Copy environment defaults:

```bash
copy .env.example .env
```

3. Create the MySQL database named in `MYSQL_DB`.

4. Run migrations:

```bash
npm run migration:run
```

5. Start the backend:

```bash
npm run start:dev
```

6. Open the reference client:

```text
http://localhost:3001/frontend/index.html
```

## Testing

Primary checks:

```bash
npm run build
npm test -- --runInBand
```

If you change schema-related code, rerun:

```bash
npm run migration:show
```

## Migrations

Use migrations as the supported schema artifact.

Common commands:

```bash
npm run migration:run
npm run migration:revert
```

Avoid relying on `DB_SYNCHRONIZE=true` for changes that should be shared with other developers or self-hosters.

## Docker Workflow

To validate the packaged self-host flow:

```bash
npm run docker:up
```

The app will wait for MySQL, run migrations, and start the backend.

## Where to Start in the Codebase

Recommended entry points:

- [`src/main.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\main.ts)
- [`src/app.module.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\app.module.ts)
- [`src/messages/messages.gateway.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\messages\messages.gateway.ts)
- [`src/presence/presence.gateway.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\presence\presence.gateway.ts)
- [`src/calls/calls.gateway.ts`](C:\Users\DEEPIJA\Downloads\chat-service\src\calls\calls.gateway.ts)
- [`frontend/index.html`](C:\Users\DEEPIJA\Downloads\chat-service\frontend\index.html)

For a deeper system walkthrough, see [`Understanding This Codebase.md`](C:\Users\DEEPIJA\Downloads\chat-service\Understanding%20This%20Codebase.md).
