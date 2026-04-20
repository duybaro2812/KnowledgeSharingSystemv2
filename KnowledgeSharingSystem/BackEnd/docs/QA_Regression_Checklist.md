# Regression Checklist (Part 2)

## 1) Chuẩn bị
- Chạy DB migration đầy đủ đến `DatabaseBusinessRules_Patch17.sql`.
- Khởi động BackEnd.
- (Khuyến nghị) seed dữ liệu demo:
  - `npm run seed:demo-data`

## 2) Chạy test tự động
- Smoke cơ bản:
  - `npm run test:smoke`
- Regression theo role:
  - `npm run test:regression`

## 3) Biến môi trường cho regression role matrix
Khai báo trong `.env`:

```env
SMOKE_USERNAME=<user_username>
SMOKE_PASSWORD=<user_password>
SMOKE_MODERATOR_USERNAME=<moderator_username>
SMOKE_MODERATOR_PASSWORD=<moderator_password>
SMOKE_ADMIN_USERNAME=<admin_username>
SMOKE_ADMIN_PASSWORD=<admin_password>
```

## 4) Những gì script đang verify
- Public endpoints hoạt động (`/health`, `/categories`, `/documents`).
- Endpoint bảo vệ từ chối khi không token.
- User:
  - truy cập được `me`, `my-uploaded`, `notifications/my`.
  - bị chặn khỏi admin/mod endpoints.
- Moderator:
  - truy cập được moderation stats/timeline.
  - bị chặn khỏi admin users list.
- Admin:
  - truy cập được users list, audit logs, moderation stats.

## 5) Manual regression bắt buộc trước deploy
- Auth: login/register/OTP/forgot-password/reset.
- Upload document + pending review.
- Reader access policy theo points/guest.
- Q&A full flow: create -> message -> close -> rate.
- Notification deep-link điều hướng đúng màn hình.
