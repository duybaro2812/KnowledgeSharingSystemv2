# NeuShare Deployment Guide (Vercel + Render + PostgreSQL)

This guide deploys the system so other users can use it online:

- FrontEnd: **Vercel**
- BackEnd: **Render (Web Service)**
- Database: **Hosted PostgreSQL** (Neon / Supabase / Render Postgres)

## 1) Prepare production secrets

Create strong values before deploy:

- `JWT_SECRET` (long random string)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

## 2) Create PostgreSQL database (cloud)

Create a hosted PostgreSQL instance and copy the connection string.

You need one URL in this format:

`postgresql://<user>:<password>@<host>:<port>/<database>?sslmode=require`

Save it as `DATABASE_URL`.

## 3) Deploy BackEnd to Render

### Option A: Blueprint (recommended)

1. Push repo to GitHub.
2. In Render, choose **New +** → **Blueprint**.
3. Select this repo.
4. Render reads [`render.yaml`](./render.yaml).
5. In service env vars, set:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `CORS_ALLOWED_ORIGINS` (your Vercel domain, e.g. `https://your-app.vercel.app`)
   - Cloudinary vars
   - SMTP vars
   - `DB_ENCRYPT=true`
   - `DB_TRUST_SERVER_CERTIFICATE=false`
6. Deploy service.

### Option B: Manual Web Service

1. New Web Service → connect repo.
2. Root directory: `BackEnd`
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add the same env vars as above.

## 4) Initialize PostgreSQL schema on production

After first backend deploy, open Render Shell for backend service and run:

```bash
npm run db:pg:schema
```

This applies [`BackEnd/sql/postgres/001_schema.sql`](./BackEnd/sql/postgres/001_schema.sql).

## 5) Verify BackEnd health

Open:

`https://<your-render-service>.onrender.com/api/health`

Expected:

- `success: true`
- `data.db.connected: true`
- `data.db.ready: true`

## 6) Deploy FrontEnd to Vercel

1. New Project → import repo.
2. Root Directory: `KnowledgeSharingSystem/FrontEnd`
3. Framework: Vite (auto detected)
4. Set env vars:
   - `VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api`
   - `VITE_API_TIMEOUT_MS=20000`
5. Deploy.

## 7) Configure CORS on Render

Set backend env:

`CORS_ALLOWED_ORIGINS=https://<your-vercel-domain>`

If you use preview domains, list multiple origins separated by comma:

`https://app.vercel.app,https://app-git-main-user.vercel.app`

## 8) Production smoke checklist

After FE + BE are online:

1. Register and login
2. Upload document
3. Open document preview
4. Create comment + reply
5. Open Q&A session and send message
6. Check notifications panel
7. Check moderator/admin dashboards

## 9) Common issues

- `CORS origin is not allowed`:
  - fix `CORS_ALLOWED_ORIGINS` on Render
- `db not ready`:
  - check `DATABASE_URL` and SSL mode
- upload works but preview fails:
  - verify Cloudinary env vars
- OTP mail not sent:
  - verify SMTP credentials and app password

## 10) Go-live notes

- Use strong `JWT_SECRET`
- Disable `OTP_DEV_FALLBACK` in production (`false`)
- Keep free tiers awake expectations in mind (cold starts on free plans)
