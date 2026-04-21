# Shipyard

Shipyard is a private deployment dashboard for running server-side deploy scripts from a web UI. It has two apps:

- `apps/api`: Hono API, PostgreSQL, Prisma, deploy runner, email notifications.
- `apps/web`: Next.js dashboard UI.

Authentication is intentionally simple: one shared PIN configured on the API with `SHIPYARD_PIN`. The web app validates the PIN, stores it in browser local storage, and sends it to the API on each request.

## Requirements

Install these on your machine or VPS:

- Node.js 20 or newer
- pnpm 9 or newer
- PostgreSQL 14 or newer
- Git
- PM2, optional but recommended for VPS production
- Nginx or another reverse proxy, optional but recommended for VPS production

Install pnpm and PM2 if needed:

```bash
npm install -g pnpm pm2
```

## Project Layout

```text
shipyard/
  apps/
    api/   # Hono API and deploy runner
    web/   # Next.js dashboard
```

Important files:

- `apps/api/src/apps.config.ts`: list of deployable apps and script paths.
- `apps/api/src/env.ts`: required API environment variables.
- `apps/web/src/lib/api.ts`: web API client using `NEXT_PUBLIC_API_URL`.
- `apps/api/ecosystem.config.cjs`: PM2 config for API.
- `apps/web/ecosystem.config.cjs`: PM2 config for web.

## 1. Clone And Install

```bash
git clone <your-repo-url> shipyard
cd shipyard
pnpm install
```

## 2. Configure The API

Create `apps/api/.env`:

```env
DATABASE_URL="postgresql://shipyard:your-password@localhost:5432/shipyard"
SHIPYARD_PIN="change-this-pin"
RESEND_API_KEY="re_your_resend_key"
NOTIFICATION_EMAIL="ops@example.com"
HOST="localhost"
PORT="3001"
```

Notes:

- `SHIPYARD_PIN` is the PIN used on the login screen.
- `RESEND_API_KEY` and `NOTIFICATION_EMAIL` are required because deploy results are emailed after scripts finish.
- `HOST` defaults to `localhost`. Use `0.0.0.0` only when the API must be reachable directly from outside the server.
- `PORT` defaults to `3001` if omitted.

## 3. Configure The Web App

Create `apps/web/.env.local` for local development:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

For VPS production, point it to the public or private API URL that the browser can reach:

```env
NEXT_PUBLIC_API_URL="https://shipyard-api.example.com"
```

If you proxy both apps behind one domain, use the proxied API URL you expose through Nginx.

## 4. Set Up PostgreSQL

Example on Ubuntu VPS:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql
```

Inside `psql`:

```sql
CREATE USER shipyard WITH PASSWORD 'your-password';
CREATE DATABASE shipyard OWNER shipyard;
GRANT ALL PRIVILEGES ON DATABASE shipyard TO shipyard;
\q
```

Then bootstrap Prisma from the repo:

```bash
cd apps/api
pnpm prisma:generate
pnpm exec prisma db push
pnpm prisma:seed
cd ../..
```

This repository currently has no committed Prisma migrations, so `prisma db push` is the practical initial bootstrap command. If migrations are added later, use this for production instead:

```bash
cd apps/api
pnpm exec prisma migrate deploy
pnpm prisma:seed
cd ../..
```

## 5. Configure Deploy Targets

Edit `apps/api/src/apps.config.ts`:

```ts
export const apps = [
  {
    id: "lms-frontend",
    label: "LMS Frontend",
    scriptPath: "/home/deploy/scripts/deploy-lms-frontend.sh",
  },
] satisfies AppDefinition[];
```

Each item becomes one card in the dashboard. `scriptPath` must point to an executable script on the API server.

Example deploy script:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /var/www/lms-frontend
git pull --ff-only
pnpm install --frozen-lockfile
pnpm build
pm2 reload lms-frontend
```

Make it executable:

```bash
chmod +x /home/deploy/scripts/deploy-lms-frontend.sh
```

The API process user must be allowed to execute the script and access all files used by that script.

## 6. Run Locally

Use two terminals.

Terminal 1, API:

```bash
pnpm dev:api
```

Terminal 2, web:

```bash
pnpm dev:web
```

Open:

```text
http://localhost:3000
```

Enter the `SHIPYARD_PIN` from `apps/api/.env`.

## 7. Build For Production

```bash
pnpm build:api
pnpm build:web
```

Useful validation commands:

```bash
pnpm --filter api typecheck
pnpm --filter web build
```

## 8. Run On A VPS With PM2

From the repo root:

```bash
pnpm install --frozen-lockfile
pnpm --filter api prisma:generate
pnpm --filter api exec prisma db push
pnpm --filter api prisma:seed
pnpm build:api
pnpm build:web
```

Start the services:

```bash
cd apps/api
pm2 start ecosystem.config.cjs
cd ../web
pm2 start ecosystem.config.cjs
pm2 save
```

Enable PM2 startup after reboot:

```bash
pm2 startup
```

Run the command PM2 prints, then:

```bash
pm2 save
```

Check logs:

```bash
pm2 logs shipyard-api
pm2 logs shipyard-web
```

## 9. Nginx Reverse Proxy Example

Example with two subdomains:

```nginx
server {
  listen 80;
  server_name shipyard.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

server {
  listen 80;
  server_name shipyard-api.example.com;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Helps live log streaming over SSE.
    proxy_buffering off;
    proxy_cache off;
  }
}
```

Reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

For HTTPS, use Certbot or your preferred TLS setup.

## 10. Updating The VPS

```bash
cd /path/to/shipyard
git pull --ff-only
pnpm install --frozen-lockfile
pnpm --filter api prisma:generate
pnpm --filter api exec prisma db push
pnpm build:api
pnpm build:web
pm2 reload shipyard-api
pm2 reload shipyard-web
```

If migrations are introduced later, replace `prisma db push` with `prisma migrate deploy`.

## Troubleshooting

### Login Always Fails

Check that `SHIPYARD_PIN` is set in the environment used by the running API process, then restart the API:

```bash
pm2 restart shipyard-api --update-env
```

### Web Cannot Reach API

Check `apps/web/.env.local` or the production environment for `NEXT_PUBLIC_API_URL`, rebuild the web app, then restart it:

```bash
pnpm build:web
pm2 restart shipyard-web --update-env
```

### Live Logs Do Not Stream

Make sure Nginx has buffering disabled for the API location:

```nginx
proxy_buffering off;
proxy_cache off;
```

### Deploy Script Does Nothing

Verify the script exists, is executable, and can run as the same user as `shipyard-api`:

```bash
ls -la /home/deploy/scripts/deploy-lms-frontend.sh
sudo -u <api-user> /home/deploy/scripts/deploy-lms-frontend.sh
```

### API Cannot Connect To Database

Verify `DATABASE_URL`, PostgreSQL status, and database permissions:

```bash
systemctl status postgresql
psql "postgresql://shipyard:your-password@localhost:5432/shipyard"
```
