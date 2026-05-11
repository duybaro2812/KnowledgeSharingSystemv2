# Docker Deployment Guide

This deployment runs by default:

- Frontend: Vite build served by Nginx
- Backend: Node.js/Express with LibreOffice for Office document preview conversion
- Database: existing PostgreSQL on the host machine through `host.docker.internal`
- External services: Cloudinary and Gmail SMTP

An optional PostgreSQL container is available through the `local-db` profile.

## 1. Prepare environment

Create `.env.docker` in the project root and set production values:

```env
NODE_ENV=production
DB_CLIENT=postgres
DB_AUTH_MODE=sql
DATABASE_URL=postgresql://postgres:your_password@host.docker.internal:5432/KSS
JWT_SECRET=replace_with_long_random_secret
JWT_EXPIRES_IN=1d
OTP_EXPIRE_MINUTES=10
OTP_DEV_FALLBACK=false
VITE_API_BASE_URL=/api
VITE_API_TIMEOUT_MS=20000
CORS_ALLOWED_ORIGINS=http://localhost:8080
RUN_DB_MIGRATIONS=true
LIBREOFFICE_BIN=/usr/bin/soffice

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_DOCUMENT_FOLDER=knowledge-sharing-system/documents

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
```

Generate a JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

For local Docker Compose, keep:

```env
VITE_API_BASE_URL=/api
CORS_ALLOWED_ORIGINS=http://localhost:8080
```

For a VPS domain with HTTPS, use your real frontend origin:

```env
CORS_ALLOWED_ORIGINS=https://your-domain.com
```

## 2. Build and start

From the `KnowledgeSharingSystem` directory:

```bash
docker compose --env-file .env.docker up --build -d
```

Local URLs:

- Frontend: `http://localhost:8080`
- Backend health: `http://localhost:3000/api/health`

The backend container runs PostgreSQL migrations automatically on startup when:

```env
RUN_DB_MIGRATIONS=true
```

If you intentionally want Docker to create and use a new local PostgreSQL container, use:

```bash
docker compose --env-file .env.docker --profile local-db up --build -d
```

In that mode, set `DATABASE_URL` to the compose service name:

```env
POSTGRES_DB=KSS
POSTGRES_USER=kss
POSTGRES_PASSWORD=change_me_strong_password
DATABASE_URL=postgresql://kss:change_me_strong_password@postgres:5432/KSS
```

## 3. Check logs

```bash
docker compose --env-file .env.docker logs -f backend
docker compose --env-file .env.docker logs -f frontend
docker compose --env-file .env.docker --profile local-db logs -f postgres
```

## 4. Stop services

```bash
docker compose --env-file .env.docker down
```

To delete Docker-created database volume:

```bash
docker compose --env-file .env.docker --profile local-db down -v
```

Only use `-v` when you intentionally want to delete the local Docker PostgreSQL data.

## 5. Production VPS notes

For production, place a reverse proxy such as Caddy, Traefik, or Nginx in front of the frontend service and enable HTTPS.

Recommended public exposure:

- Public: frontend on port 80/443 through reverse proxy
- Private/internal: backend and postgres

Cloudinary and Gmail SMTP continue to work normally from Docker as long as outbound HTTPS and SMTP access are allowed.

## 6. Smoke checklist

After deploy:

1. Open `/api/health`.
2. Register user and verify OTP.
3. Add recovery email and verify OTP.
4. Reset password by primary email.
5. Reset password by recovery email.
6. Upload PDF/DOCX.
7. Approve document as admin.
8. Open preview and download.
9. Create comment.
10. Create Q&A session.
