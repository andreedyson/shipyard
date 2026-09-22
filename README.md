# Shipyard

Shipyard is a private deployment dashboard for running server-side deploy scripts from a web UI. It has two apps:

- `apps/api`: Hono API, PostgreSQL, Prisma, deploy runner, email notifications.
- `apps/web`: Next.js dashboard UI.

Authentication uses one shared PIN configured with `SHIPYARD_PIN`. A successful login creates a signed, expiring HttpOnly session cookie; the PIN is never stored by the browser or placed in a log-stream URL.

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

- `apps/api/apps.config.local.json`: server-local list of deployable apps and script paths.
- `apps/api/src/lib/script-store.ts`: validated, atomic deploy-script editing.
- `apps/api/src/env.ts`: required API environment variables.
- `apps/web/src/lib/api.ts`: web API client using `NEXT_PUBLIC_API_URL`.
- `apps/api/ecosystem.config.cjs`: PM2 config for API.
- `apps/web/ecosystem.config.cjs`: PM2 config for web.

## 1. Clone And Install

```bash
git clone https://github.com/your-org/shipyard.git shipyard
cd shipyard
pnpm install
```

## 2. Configure The API

Create `apps/api/.env`:

```env
DATABASE_URL="postgresql://shipyard:your-password@localhost:5432/shipyard"
SHIPYARD_PIN="change-this-pin"
SESSION_SECRET="replace-with-at-least-32-random-characters"
RESEND_API_KEY="re_your_resend_key"
RESEND_FROM="Shipyard <onboarding@resend.dev>"
NOTIFICATION_EMAIL="ops@example.com"
WEB_ORIGIN="https://shipyard.example.com"
WEB_ORIGINS="https://shipyard.example.com"
COOKIE_SECURE="true"
SESSION_TTL_HOURS="12"
LOG_MAX_BYTES="2000000"
SCRIPT_EDIT_ROOT="/home/deploy/scripts"
SCRIPT_MAX_BYTES="100000"
HOST="localhost"
PORT="3001"
```

Notes:

- `SHIPYARD_PIN` is the PIN used on the login screen.
- `RESEND_API_KEY`, `RESEND_FROM`, and `NOTIFICATION_EMAIL` configure deploy result emails.
- `HOST` defaults to `localhost`. Use `0.0.0.0` only when the API must be reachable directly from outside the server.
- `PORT` defaults to `3001` if omitted.
- `SCRIPT_EDIT_ROOT` is the only directory whose scripts can be changed from the dashboard. It defaults to `/home/deploy/scripts`.
- `SCRIPT_MAX_BYTES` limits the size of a script loaded or saved by the editor. It defaults to 100,000 bytes.

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
pnpm exec prisma migrate deploy
pnpm prisma:seed
cd ../..
```

The committed migration history is the source of truth. Use `migrate dev` only when authoring a future schema change locally:

```bash
cd apps/api
pnpm exec prisma migrate dev
cd ../..
```

### Upgrading an existing production database created with `db push`

Do this once per existing database. Do not run the baseline command on a fresh, empty database.

1. Back up PostgreSQL and stop the old Shipyard API so no deployment can start during the migration.
2. Point `DATABASE_URL` at the existing production database.
3. Confirm that no old deploy process is still running. If the old API left only stale deployments marked as running, mark those rows interrupted before adding the active-deployment constraint:

   ```sql
   UPDATE "Deploy" SET "status" = 'interrupted' WHERE "status" = 'running';
   UPDATE "App" SET "status" = 'interrupted' WHERE "status" = 'running';
   ```

4. Record the initial migration as already applied. This creates migration history without running the `CREATE TABLE` statements against existing tables:

   ```bash
   pnpm db:baseline:legacy
   ```

5. Apply only the new lifecycle migrations and verify the result:

   ```bash
   pnpm db:migrate:deploy
   pnpm --filter api prisma:migrate:status
   ```

6. Deploy the new API and web builds. Future releases only need `pnpm db:migrate:deploy`; never baseline this database again.

The upgrade keeps all existing apps, deploy history, and logs. Users need to sign in again because authentication now uses an HttpOnly session cookie. Set `WEB_ORIGIN` (or comma-separated `WEB_ORIGINS`) to the real dashboard origin; `SESSION_SECRET` is strongly recommended but falls back to `SHIPYARD_PIN` for compatibility. Set `COOKIE_SECURE=true` only when the dashboard is served over HTTPS.

### VPN-only production rollout order

When the server and database are reachable only over VPN, connect the VPN first and run the migration on the server over SSH. Do not point a laptop's development `.env` at production unless you have deliberately secured and isolated that shell.

```text
Mac: connect VPN
  → SSH to the production server
  → back up PostgreSQL
  → stop shipyard-api (and prevent new deploys)
  → clean stale `running` rows if any
  → run `pnpm db:baseline:legacy` once
  → run `pnpm db:migrate:deploy`
  → build API/web and restart PM2
  → while still on VPN, check `/`, login, `/apps`, and one log stream
```

For future releases, keep the same VPN/SSH discipline but skip the baseline step. Run `pnpm db:migrate:deploy` before restarting the new API. If the dashboard is served from the same VPN IP through Nginx, set `NEXT_PUBLIC_API_URL` to that browser-reachable origin (or the proxied `/api` origin), and set API `WEB_ORIGIN` to the exact dashboard origin. Do not use `localhost` in either variable for a browser running on your Mac. For a temporary HTTP-only VPN setup such as `http://10.8.0.1:3081`, use `WEB_ORIGIN="http://10.8.0.1:3081"` and `COOKIE_SECURE=false`; HTTPS should be the long-term setup.

## 5. Configure Deploy Targets

Copy `apps/api/apps.config.local.json.example` to the ignored file
`apps/api/apps.config.local.json`, then edit that local file on each server:

```bash
cp apps/api/apps.config.local.json.example apps/api/apps.config.local.json
```

The API loads that ignored JSON at startup. You can put it outside the repository and set `APPS_CONFIG_PATH` if preferred. Each command must point to an executable file on the API server. A rollback script receives its target revision in `SHIPYARD_TARGET_REVISION`; every script receives `SHIPYARD_DEPLOY_ID` and `SHIPYARD_ACTION`.

If an existing server currently has local edits to the tracked `src/apps.config.ts`, migrate those values once before pulling this version:

```bash
cp apps/api/src/apps.config.ts /tmp/shipyard-apps.config.ts.backup
git stash push -m "save server deploy targets before config split" -- apps/api/src/apps.config.ts
git pull --ff-only
cp apps/api/apps.config.local.json.example apps/api/apps.config.local.json
```

Copy the real commands, working directories, and health-check URLs from `/tmp/shipyard-apps.config.ts.backup` into `apps.config.local.json`. Do not run `git stash pop`; the tracked TypeScript file is now the shared loader and should stay identical across servers. Keep the stash as a rollback until the new API has started successfully.

Example deploy script:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /var/www/example-web
git pull --ff-only
pnpm install --frozen-lockfile
pnpm build
pm2 reload example-web
```

Make it executable:

```bash
chmod +x /home/deploy/scripts/deploy-example-web.sh
```

The API process user must be allowed to read and execute each script. To use the
dashboard editor, that user must also be able to create and rename files in
`SCRIPT_EDIT_ROOT`; write permission on only the existing file is not enough for
an atomic replacement.

For example, when PM2 and the API run as the `deploy` user:

```bash
sudo install -d -o deploy -g deploy -m 750 /home/deploy/scripts
sudo chown deploy:deploy /home/deploy/scripts/deploy-example-web.sh
sudo chmod 750 /home/deploy/scripts/deploy-example-web.sh
```

Keep `SCRIPT_EDIT_ROOT` narrow. Do not set it to `/`, `/home`, the repository
root, or another directory containing unrelated executable files. Configured
scripts must be regular files inside that root; the editor deliberately refuses
relative paths and symbolic links.

### Build a deployment pipeline from the dashboard

After signing in, find the application card and click **Script**. If the app has
a rollback script, the editor displays **Deploy** and **Rollback** tabs. The
default **Pipeline steps** view presents the shell commands as an ordered list.

For an existing unstructured script, Shipyard imports blank-line-separated
shell blocks as steps and infers names from comments, `echo` messages, and
common commands. Review the order, then click **Convert** or edit any step to
convert it to a managed pipeline.

From the pipeline editor you can:

- Rename a step and edit its multiline shell command.
- Move steps up or down to change execution order.
- Temporarily disable a step without deleting its command.
- Add and remove command steps.
- Switch to **Advanced** to inspect or edit the exact executable shell script.

Click **Save pipeline** when finished. Shipyard generates a normal Bash or `sh`
file, adds comment-only markers that preserve the step names and order, and runs
`bash -n` or `sh -n` before changing the live file. The deployment engine still
executes the configured `.sh` file directly; it does not need a separate
runtime or database record.

Step order matters. Keep variable definitions, lock acquisition, and `cd`
commands before steps that depend on them. Use **Advanced** for complex shell
constructs when representing them as a single multiline step is clearer.

Saving does not restart Shipyard. The API writes a temporary file beside the
script and atomically replaces the live file, so a deployment that is already
running continues with the old file while the next deployment gets the new
one. If another browser or SSH session changed the script after the editor
loaded it, Shipyard rejects the stale save and asks you to reload.

Before each replacement, Shipyard copies the prior version to:

```text
<script-directory>/.shipyard-history/<script-filename>/
```

The newest 20 backups per script are retained. Successful edits also appear in
the audit log as `script.deploy.updated` or `script.rollback.updated`.

Script editing grants the signed-in user the ability to run commands as the
Shipyard API operating-system user. Keep the dashboard behind HTTPS and/or your
VPN, use a strong PIN and `SESSION_SECRET`, and do not expose the API directly
to the public internet.

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
pnpm --filter api prisma:migrate:deploy
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

The PM2 configs pin each process's working directory to its own app folder, so `dotenv/config` consistently loads `apps/api/.env` even when PM2 is started from the repository root.

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
pnpm --filter api prisma:migrate:deploy
pnpm build:api
pnpm build:web
pm2 reload shipyard-api
pm2 reload shipyard-web
```

For the first update that includes dashboard script editing:

1. Wait until no deployment is active. Restarting the API during a deployment
   marks that deployment as interrupted.
2. Add `SCRIPT_EDIT_ROOT` and optionally `SCRIPT_MAX_BYTES` to `apps/api/.env`.
3. Give the API process user directory-level write permission as shown in
   [Configure Deploy Targets](#5-configure-deploy-targets).
4. Run the normal install and build commands above, then reload the API and web
   processes.

No database migration is required for the script editor. After this one-time
rollout, changing a script from the dashboard requires neither SSH nor a PM2
restart.

Do not use `prisma db push` for a shared or production database; it bypasses the committed migration history.

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
ls -la /home/deploy/scripts/deploy-example-web.sh
sudo -u <api-user> /home/deploy/scripts/deploy-example-web.sh
```

### Script Button Is Missing Or Saving Fails

The **Script** button is shown only when the configured command is an absolute
path inside `SCRIPT_EDIT_ROOT`. Confirm the effective paths and permissions:

```bash
sudo -u <api-user> test -r /home/deploy/scripts/deploy-example-web.sh
sudo -u <api-user> test -x /home/deploy/scripts/deploy-example-web.sh
sudo -u <api-user> test -w /home/deploy/scripts
```

Also verify that the script is a regular file rather than a symbolic link, is
smaller than `SCRIPT_MAX_BYTES`, and starts with a supported Bash or `sh`
shebang. After changing environment variables, restart the API with
`pm2 restart shipyard-api --update-env`.

### API Cannot Connect To Database

Verify `DATABASE_URL`, PostgreSQL status, and database permissions:

```bash
systemctl status postgresql
psql "postgresql://shipyard:your-password@localhost:5432/shipyard"
```
