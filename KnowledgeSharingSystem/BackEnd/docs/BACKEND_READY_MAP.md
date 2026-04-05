# Backend Ready Map

Tai lieu nay tom tat cac API backend da san sang de FrontEnd su dung.

## Response Contract

Tat ca API nen duoc FE xu ly theo format chung:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": {}
}
```

Neu loi, backend tra `statusCode` phu hop nhu `400`, `401`, `403`, `404`, `409`, `429`, `500`.

## Auth

Base: `/api/auth`

- `POST /register`
  - Dang ky truc tiep.
- `POST /register/request-otp`
  - Xin OTP dang ky.
- `POST /register/verify-otp`
  - Xac thuc OTP dang ky.
- `POST /forgot-password/request-otp`
  - Xin OTP quen mat khau.
- `POST /forgot-password/reset`
  - Doi mat khau bang OTP.
- `POST /login`
  - Dang nhap user/moderator.
- `POST /login/admin`
  - Dang nhap admin.
- `GET /me`
  - Lay profile nguoi dang nhap.

## User Profile

Base: `/api/users`

- `PATCH /me`
  - Cap nhat profile ca nhan.
- `PATCH /me/password`
  - Doi mat khau.

## Admin User Management

Base: `/api/users`

- `GET /`
  - Danh sach user, chi admin.
- `GET /audit-logs`
  - Log hanh dong admin.
- `PATCH /:id/active-status`
  - Khoa / mo khoa tai khoan.
- `PATCH /:id/role`
  - Promote moderator / demote user.
- `DELETE /:id`
  - Xoa mem user.

## Categories

Base: `/api/categories`

- `GET /`
  - Lay danh sach category.
- `POST /`
  - Tao category, chi moderator/admin.

## Documents - Public/User

Base: `/api/documents`

- `GET /`
  - Danh sach tai lieu approved.
- `GET /:id`
  - Chi tiet tai lieu.
- `POST /`
  - Upload tai lieu.
  - Multipart field file: `documentFile`
- `PUT /:id`
  - Sua tai lieu.
- `GET /my-uploaded`
  - Tai lieu cua toi.
- `POST /:id/report`
  - Report tai lieu.
- `GET /:id/engagement`
  - Tong hop like/dislike/save.
- `PATCH /:id/reaction`
  - Like / dislike / bo reaction.
- `PATCH /:id/save`
  - Save / unsave.
- `GET /:id/access`
  - Rule truy cap theo diem.
- `POST /:id/view`
  - Dang ky luot xem full tai lieu.
- `POST /:id/download`
  - Dang ky download va tru diem neu hop le.
- `GET /:id/plagiarism-check`
  - Owner hoac admin/moderator check dao van.

## Documents - Moderator/Admin

Base: `/api/documents`

- `GET /all-uploaded`
  - Tat ca tai lieu upload.
- `GET /pending`
  - Tai lieu dang cho duyet.
- `PATCH /:id/review`
  - Duyet / reject tai lieu.
- `PATCH /:id/lock`
  - Khoa tai lieu.
- `PATCH /:id/unlock`
  - Mo khoa tai lieu.
- `DELETE /:id`
  - Xoa tai lieu.
- `GET /reports/pending`
  - Queue report dang mo.
- `GET /:id/reports`
  - Lich su report cua tai lieu.
- `PATCH /:id/report-resolution`
  - Xu ly report: unlock / delete.
- `GET /:id/check-duplicate`
  - Check duplicate cho moderator/admin.
- `POST /:id/plagiarism-recheck`
  - Re-check lai tai lieu cu.
- `PATCH /:id/plagiarism-resolution`
  - Xu ly duplicate:
    - `approve_anyway`
    - `reject_duplicate`
- `GET /:id/duplicate-candidates`
  - Danh sach candidate nghi trung.

## Access Rule Hien Tai

Ket qua tu `GET /api/documents/:id/access` la nguon chinh de FE quyet dinh UI.

- `< 30 diem`
  - Vao duoc trang tai lieu.
  - Van comment / reply / tao Q&A duoc.
  - Khong xem full.
  - Khong download.
  - Co `accessState = "locked_points"` va `lockedOverlay` de FE phu lop chan.
- `30 - 39 diem`
  - Xem full co gioi han so luot.
  - Comment / Q&A duoc.
  - Chua download duoc.
- `>= 40 diem`
  - Xem full.
  - Download duoc va tru diem theo rule.
- `owner`, `moderator`, `admin`
  - Bypass toan bo.

## Comments

Base:

- `GET /api/documents/:id/comments`
- `POST /api/documents/:id/comments`
- `POST /api/comments/:id/replies`
- `DELETE /api/comments/:id`

Moderator/Admin:

- `GET /api/comments/moderation/pending`
- `PATCH /api/comments/:id/review`
- `PATCH /api/comments/:id/hide`

## Q&A Sessions

Base: `/api/qa-sessions`

- `POST /`
  - Tao session hoi dap.
- `GET /my`
  - Session cua toi.
- `GET /:id/messages`
  - Lay tin nhan trong session.
- `POST /:id/messages`
  - Gui tin nhan.
- `PATCH /:id/close`
  - Dong session.
- `POST /:id/rate`
  - Danh gia 1-5 sao.

## Points

Base: `/api/points`

User:

- `GET /policy`
- `GET /me/summary`
- `GET /me/transactions`
- `GET /me/events`

Moderator/Admin:

- `GET /events/pending`
- `PATCH /events/:eventId/review`

## Notifications

Base: `/api/notifications`

- `GET /stream`
  - SSE stream.
- `GET /summary`
  - Tong hop unread count.
- `GET /my`
  - Danh sach thong bao.
- `PATCH /read-all`
- `PATCH /:id/read`

## Moderation Dashboard

Base: `/api/moderation`

- `GET /queue`
  - Queue tong hop:
    - documents
    - comments
    - reports
    - pointEvents
- `GET /stats`
  - So lieu moderation.
- `GET /timeline`
  - Lich su moderation.

## Goi Y Mapping Theo Man Hinh FE

### User Home / Library

- `GET /api/auth/me`
- `GET /api/documents`
- `GET /api/documents/my-uploaded`
- `GET /api/points/me/summary`
- `GET /api/notifications/summary`

### Document Detail

- `GET /api/documents/:id`
- `GET /api/documents/:id/access`
- `GET /api/documents/:id/engagement`
- `GET /api/documents/:id/comments`
- `PATCH /api/documents/:id/reaction`
- `PATCH /api/documents/:id/save`
- `POST /api/documents/:id/view`
- `POST /api/documents/:id/download`
- `POST /api/documents/:id/report`
- `POST /api/documents/:id/comments`
- `POST /api/comments/:id/replies`
- `POST /api/qa-sessions`

### Points Page

- `GET /api/points/policy`
- `GET /api/points/me/summary`
- `GET /api/points/me/transactions`
- `GET /api/points/me/events`

### Notification Dropdown

- `GET /api/notifications/summary`
- `GET /api/notifications/my`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

### Moderator Workspace

- `GET /api/moderation/queue`
- `GET /api/moderation/stats`
- `GET /api/moderation/timeline`
- `PATCH /api/documents/:id/review`
- `GET /api/documents/:id/check-duplicate`
- `PATCH /api/documents/:id/plagiarism-resolution`
- `GET /api/comments/moderation/pending`
- `PATCH /api/comments/:id/review`
- `GET /api/points/events/pending`
- `PATCH /api/points/events/:eventId/review`
- `GET /api/documents/reports/pending`
- `PATCH /api/documents/:id/report-resolution`

### Admin Workspace

Su dung toan bo moderator API va them:

- `GET /api/users`
- `GET /api/users/audit-logs`
- `PATCH /api/users/:id/active-status`
- `PATCH /api/users/:id/role`
- `DELETE /api/users/:id`

## Ghi Chu FE

- Notification nen uu tien dung `metadata.route` hoac `targetRoute` neu co.
- Cac UI permission nen dua tren:
  - `req.user.role`
  - `access policy`
  - `document.status`
- Download flow:
  1. `GET /documents/:id/access`
  2. neu co `downloadConfirmation`, hien popup xac nhan mat diem
  3. user dong y
  4. `POST /documents/:id/download`

