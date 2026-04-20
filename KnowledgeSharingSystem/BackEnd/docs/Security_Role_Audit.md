# Security & Role Audit (Part 4)

## Đã triển khai

## 1) Auth middleware hardening
- Chỉ chấp nhận `token` trên query string cho route GET preview content:
  - `/api/documents/:id/viewer/content`
- Các route còn lại bắt buộc `Authorization: Bearer <token>`.
- Khi auth fail, runtime metrics tăng `authFailures`.

## 2) Role middleware hardening
- So sánh role theo chuẩn hóa:
  - trim + lowercase
- Tránh lỗi sai khác hoa/thường trong token payload.

## 3) Role boundary cần đảm bảo
- User không truy cập được:
  - `/api/moderation/*`
  - `/api/users/*`
  - review point events của moderator/admin
- Moderator không truy cập được:
  - admin user management (`/api/users/*`)
- Admin truy cập đầy đủ các route quản trị.

## 4) Checklist audit định kỳ
- Verify JWT secret đủ mạnh, khác giữa môi trường.
- CORS chỉ whitelist domain frontend production.
- Review endpoint upload:
  - kiểm tra mime/size/hash.
- Log các hành vi nhạy cảm:
  - lock/unlock/delete document
  - role change / active status change
  - point moderation review

## 5) Gợi ý bổ sung (next step)
- Add refresh token + revoke list.
- Add CSRF protection nếu dùng cookie-based auth.
- Add brute-force limiter theo IP + username cho login.
- Add audit trail cho mọi thao tác admin/moderator ở cùng một chuẩn schema.
