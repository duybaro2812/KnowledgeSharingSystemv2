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
- Hidden Knowledge migration: `sql/postgres/002_hidden_knowledge.sql`
- Point Policy migration: `sql/postgres/003_point_policy_settings.sql`
- Apply Hidden Knowledge migration: `npm run db:pg:hidden-knowledge`
- Apply Point Policy migration: `npm run db:pg:point-policy`
- Full one-shot DB validation: `sql/postgres_full_system_check.sql`

Point policy endpoints:

- `GET /api/points/policy`
- `PATCH /api/points/policy` (admin only)

The backend now runs in PostgreSQL-only mode; the old migration endpoint gate has been removed.

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
