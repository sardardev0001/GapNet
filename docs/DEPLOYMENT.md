# Deploying GapNet

The included Docker Compose stack is suited to **local development and private testing**, not an internet-ready production server by itself.

## Local Docker deployment

Prerequisites: Docker Desktop with Compose, Windows PowerShell or any compatible shell.

```powershell
Copy-Item .env.example .env
notepad .env
# Fill POSTGRES_PASSWORD and DJANGO_SECRET_KEY using independent strong random values.
.\scripts\Start-GapNet-Server.ps1
```

Open http://localhost:8084/ and verify http://localhost:8084/health/ .

Inspect containers and run smoke tests:

```powershell
docker compose ps
docker compose logs backend --tail 100
node .\scripts\smoke-test.mjs
```

**Important:** a successful image build does not prove API end-to-end correctness. Complete registration, private/group messaging, WebSocket, file-upload, and desktop checks before release.

## Public server checklist

1. Put the app behind a properly configured HTTPS reverse proxy (TLS certificates, renewal, HSTS after validation), with WSS support.
2. Set strong `DJANGO_SECRET_KEY` and `POSTGRES_PASSWORD`, secure Django settings and `ALLOWED_HOSTS`; set `SECURE_COOKIES=1` if using cookies.
3. Restrict database and Redis to private internal networks, configure firewalls, rate-limiting, and backups with tested restores.
4. Harden authentication/session storage, attachment validation, anti-abuse controls, and logging.
5. Pin and audit dependencies, enable monitoring, and verify all CI and E2E tests.
6. Treat Electron downloads and installers as release artifacts; do not commit `node_modules/`, `desktop/release/` or generated `.exe` files to source control.

The supplied `docker-compose.yml` publishes plain HTTP on `GAPNET_PORT` and should **not** be placed directly on the public internet.
