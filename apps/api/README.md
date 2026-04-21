# Shipyard API

Private deployment API for the Shipyard dashboard. The API is protected with a shared PIN, not JWT.

## Environment

```env
DATABASE_URL="postgresql://..."
SHIPYARD_PIN="change-this-pin"
RESEND_API_KEY="re_..."
NOTIFICATION_EMAIL="ops@example.com"
PORT="3001"
```

## Authentication

`POST /auth/login` validates the PIN before the web app stores it locally.

```json
{
  "pin": "123456"
}
```

Protected HTTP routes require the same PIN in the `x-shipyard-pin` header.

```http
x-shipyard-pin: 123456
```

The logs SSE endpoint also accepts `?pin=...` because browser `EventSource` cannot send custom headers.

## Routes

- `GET /` health check
- `POST /auth/login` PIN validation
- `GET /apps` list configured apps and deploy status
- `POST /deploy/:appId` trigger a deploy
- `GET /logs/:deployId` stream deploy logs

## Scripts

```bash
pnpm --filter api dev
pnpm --filter api build
pnpm --filter api typecheck
pnpm --filter api prisma:generate
pnpm --filter api prisma:seed
```
