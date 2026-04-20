# Observability Runbook (Part 5)

## 1) Health endpoint
- URL: `GET /api/health`
- Trả về:
  - runtime metrics (`requests`, latency, auth failures, rate-limit hits)
  - database readiness (`db.connected`, `db.ready`)
- Status code:
  - `200`: API + DB ready
  - `503`: API chạy nhưng DB không sẵn sàng

## 2) Access log
Biến môi trường:

```env
ENABLE_ACCESS_LOG=true
SLOW_REQUEST_THRESHOLD_MS=1200
```

Hệ thống log request khi:
- status >= 400, hoặc
- thời gian xử lý >= ngưỡng slow-request

Log gồm:
- method, URL, status, duration
- userId (nếu có), ip, requestId

## 3) Theo dõi nhanh khi có sự cố
1. Gọi `/api/health`.
2. Kiểm tra `db.ready`.
3. Kiểm tra `authFailures` tăng bất thường không.
4. Kiểm tra `4xx/5xx` ratio trong runtime snapshot.
5. Dùng `requestId` trên lỗi frontend để truy vết log backend.

## 4) Chuẩn vận hành trước deploy
- Bật log ở staging + production.
- Cấu hình giám sát external ping `/api/health` mỗi 1 phút.
- Đặt cảnh báo:
  - DB readiness false > 2 lần liên tiếp.
  - 5xx rate > ngưỡng.
  - avg response time tăng đột biến.
