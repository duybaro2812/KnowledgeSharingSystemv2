# BackEnd

## Run

1. Copy `.env.example` to `.env` and fill values.
2. Install dependencies:
   - `npm install`
3. Start server:
   - `npm run dev` (development)
   - `npm start` (production)

### Database mode

Backend is now configured for **PostgreSQL**.

- Schema baseline: `sql/postgres/001_schema.sql`
- Full one-shot DB validation: `sql/postgres_full_system_check.sql`

Current PostgreSQL endpoint status (migration gate):

- Enabled:
  - `GET /api/health`
  - `POST /api/auth/login`
  - `POST /api/auth/login/admin`
  - `POST /api/auth/register`
  - `POST /api/auth/register/request-otp`
  - `POST /api/auth/register/verify-otp`
  - `POST /api/auth/forgot-password/request-otp`
  - `POST /api/auth/forgot-password/reset`
  - `GET /api/auth/me`
  - `GET /api/categories`
  - `POST /api/categories`
  - `GET /api/documents`
  - `GET /api/documents/:id`
  - `POST /api/documents/:id/report`
  - `GET /api/documents/:id/engagement`
  - `PATCH /api/documents/:id/reaction`
  - `PATCH /api/documents/:id/save`
  - `GET /api/documents/:id/comments`
  - `POST /api/documents/:id/comments`
  - `POST /api/comments/:id/replies`
  - `DELETE /api/comments/:id`
  - `GET /api/comments/moderation/pending`
  - `PATCH /api/comments/:id/review`
  - `PATCH /api/comments/:id/hide`
  - `POST /api/comments/:id/point-events/ensure`
  - `GET /api/notifications/stream`
  - `GET /api/notifications/my`
  - `GET /api/notifications/summary`
  - `PATCH /api/notifications/read-all`
  - `PATCH /api/notifications/:id/read`
  - `GET /api/points/policy`
  - `GET /api/points/me/summary`
  - `GET /api/points/me/transactions`
  - `GET /api/points/me/events`
  - `GET /api/points/events/pending`
  - `PATCH /api/points/events/:eventId/review`
- Others return `501` until migration phase continues.

## Runtime health metrics

- Health endpoint:
  - `GET /api/health`
- Includes:
  - uptime
  - request totals by status class
  - avg/max response time
  - auth failure count
  - rate-limit hit count
  - DB readiness

Access-log tuning:

- `ENABLE_ACCESS_LOG=true`
- `SLOW_REQUEST_THRESHOLD_MS=1200`

Runbook:

- `docs/Observability_Runbook.md`

## Security hardening notes

- Login lockout is enabled (in-memory):
  - `AUTH_MAX_FAILED_ATTEMPTS`
  - `AUTH_LOCKOUT_WINDOW_MINUTES`
  - `AUTH_LOCKOUT_DURATION_MINUTES`
- API rate-limit buckets include `Retry-After` in `429` responses.
- Query-string token is only accepted on protected viewer-content GET route.
- Role checks are normalized (trim + lowercase) to avoid role-case mismatch.

Security audit checklist:

- `docs/Security_Role_Audit.md`
