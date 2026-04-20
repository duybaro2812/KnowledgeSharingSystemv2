# UX Stability Notes (Part 3)

## Đã áp dụng

## 1) Chống thao tác lặp (double submit)
- Thêm action-lock theo `actionKey` trong `AppController.call`.
- Các nghiệp vụ đã dùng lock:
  - Login / OTP / Forgot password flow
  - Upload document
  - Topbar search
  - Q&A open/create/send/close
  - Document download/register
  - Notification open/mark-read

## 2) Feedback/toast nhất quán
- Success và error toast tự tắt.
- Login success ưu tiên timeout ngắn (2s).
- Error toast tự tắt để không che màn hình quá lâu.

## 3) API timeout để tránh “đứng” UI
- `apiRequest` có timeout qua `AbortController`.
- Cấu hình bằng `VITE_API_TIMEOUT_MS` (mặc định 20000ms).
- Request timeout trả về message rõ ràng cho người dùng.

## 4) Điều hướng sạch hơn
- Khi đổi tab, xóa stale error để tránh hiển thị lỗi không còn liên quan.
