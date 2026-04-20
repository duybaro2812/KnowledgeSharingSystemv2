# BackEnd

## Run

1. Copy `.env.example` to `.env` and fill values.
2. Install dependencies:
   - `npm install`
3. Start server:
   - `npm run dev` (development)
   - `npm start` (production)

## Seed demo data

- `npm run seed:demo-data`
- `npm run seed:test-data`

## Smoke test

Run while backend is up:

- `npm run test:smoke`

Optional auth checks:

- `SMOKE_USERNAME=<username>`
- `SMOKE_PASSWORD=<password>`
- `SMOKE_API_BASE_URL=http://localhost:3000/api`

## Regression test (role matrix)

Run while backend is up:

- `npm run test:regression`

Optional role credentials:

- `SMOKE_MODERATOR_USERNAME=<username>`
- `SMOKE_MODERATOR_PASSWORD=<password>`
- `SMOKE_ADMIN_USERNAME=<username>`
- `SMOKE_ADMIN_PASSWORD=<password>`

See full checklist:

- `docs/QA_Regression_Checklist.md`

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
