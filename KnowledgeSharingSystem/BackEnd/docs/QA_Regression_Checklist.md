# Regression Checklist (PostgreSQL)

## 1) Setup

- Ensure PostgreSQL schema is applied:
  - `npm run db:pg:schema`
- Start BackEnd:
  - `npm run dev`
- Optional demo seed:
  - `npm run seed:demo-data`

## 2) Automated checks

- Smoke:
  - `npm run test:smoke`
- Regression role matrix:
  - `npm run test:regression`

## 3) Optional credentials for role matrix

Set in `.env`:

```env
SMOKE_USERNAME=<user_username>
SMOKE_PASSWORD=<user_password>
SMOKE_MODERATOR_USERNAME=<moderator_username>
SMOKE_MODERATOR_PASSWORD=<moderator_password>
SMOKE_ADMIN_USERNAME=<admin_username>
SMOKE_ADMIN_PASSWORD=<admin_password>
```

## 4) What scripts verify

- Public endpoints (`/health`, `/categories`, `/documents`) are reachable.
- Protected endpoint denies access without token.
- User role:
  - can access personal endpoints.
  - is blocked from moderator/admin endpoints.
- Moderator role:
  - can access moderation endpoints.
- Admin role:
  - can access user management + audit endpoints.

## 5) Manual regression before deploy

- Auth: login/register/OTP/forgot/reset.
- Upload document and moderation flow.
- Reader access policy by points/guest.
- Q&A flow: create -> message -> close -> rate.
- Notifications deep-link to correct screens.
