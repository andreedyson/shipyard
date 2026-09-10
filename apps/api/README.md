# Shipyard API

Private deployment API for the Shipyard dashboard. The API is protected with a shared PIN, not JWT.

## Environment

```env
DATABASE_URL="postgresql://..."
SHIPYARD_PIN="change-this-pin"
SESSION_SECRET="replace-with-at-least-32-random-characters"
RESEND_API_KEY="re_..."
NOTIFICATION_EMAIL="ops@example.com"
WEB_ORIGIN="http://localhost:3000"
SESSION_TTL_HOURS="12"
LOG_MAX_BYTES="2000000"
PORT="3001"
```

## Authentication

`POST /auth/login` validates the PIN and creates a signed HttpOnly session cookie.

```json
{
  "pin": "123456"
}
```

Protected routes, including SSE logs, use that cookie. Cross-origin browser calls must send credentials and originate from `WEB_ORIGIN`.

## Routes

- `GET /` health check
- `POST /auth/login` PIN validation
- `GET /apps` list configured apps and deploy status
- `POST /deploy/:appId` trigger a deploy
- `POST /deploy/:appId/rollback` roll back to the previous successful revision
- `POST /deploy/id/:deployId/cancel` cancel an active deploy
- `GET /logs/:deployId` stream deploy logs

## Scripts

```bash
pnpm --filter api dev
pnpm --filter api build
pnpm --filter api typecheck
pnpm --filter api prisma:generate
pnpm --filter api prisma:seed
```

For a production database that previously used `prisma db push`, stop the API, back up the database, and run this once before the first `migrate deploy`:

```bash
pnpm --filter api prisma:baseline:legacy
pnpm --filter api prisma:migrate:deploy
pnpm --filter api prisma:migrate:status
```

The baseline command must not be used for an empty database. See the root README for the stale-running-deployment cleanup step and complete rollout order.
