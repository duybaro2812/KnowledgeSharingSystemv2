# Danh Sach Nghiep Vu SQL Server

Tai lieu nay chot lai cac nghiep vu dat trong SQL Server sau khi loai bo toan bo phan tu dong tinh diem.

## Nguyen tac moi

- Database chi xu ly nghiep vu noi dung, kiem duyet va bao cao.
- Cac nghiep vu lien quan den tinh diem, cong diem, tru diem, quy tac diem, xep hang theo diem:
  tam thoi khong trien khai trong SQL Server business layer nay.
- Viec cho diem duoc xem la nghiep vu rieng, do moderator tu danh gia theo noi dung bai dang, binh luan, cau hoi, cau tra loi.

## 1. Nhom tai khoan

### Dang ky tai khoan
- Muc tieu: tao user moi.
- Kiem tra: email khong trung.
- Ket qua: them vao `Users`.

### Khoa / mo khoa tai khoan
- Muc tieu: quan ly trang thai user.
- Ket qua: cap nhat `Users.isActive`.

### Xac thuc tai khoan
- Muc tieu: danh dau user da duoc xac minh.
- Ket qua: cap nhat `Users.isVerified`.

## 2. Nhom tai lieu

### Tao tai lieu
- Muc tieu: user dang metadata tai lieu.
- Ket qua: them `Documents`, them `DocumentCategories`, ghi log.

### Cap nhat tai lieu
- Muc tieu: sua thong tin va danh muc tai lieu.
- Ket qua: cap nhat `Documents` va `DocumentCategories`.

### An tai lieu
- Muc tieu: khong xoa cung ma doi sang `hidden`.

### Xem danh sach tai lieu da duyet
- Muc tieu: tong hop tai lieu approved de hien thi.
- Ket qua: `VIEW`.

## 3. Nhom duyet tai lieu

### Duyet tai lieu
- Muc tieu: moderator/admin xet duyet approved/rejected.
- Ket qua: them `DocumentReviews`, dong bo `Documents.status`.

### Xem lich su duyet
- Muc tieu: theo doi cac lan duyet.
- Ket qua: `VIEW`.

## 4. Nhom tuong tac tri thuc

### Tao binh luan
- Muc tieu: user dong gop binh luan vao tai lieu approved.
- Ket qua: them `Comments`, ghi log.

### Tao cau hoi
- Muc tieu: user dat cau hoi cho tai lieu approved.
- Ket qua: them `Questions`, ghi log.

### Tao cau tra loi
- Muc tieu: user tra loi cau hoi.
- Ket qua: them `Answers`, ghi log.

### Chap nhan cau tra loi
- Muc tieu: chon 1 cau tra loi tot nhat.
- Ket qua: `Answers.isAccepted = 1`, `Questions.status = resolved`.

## 5. Nhom bao cao vi pham

### Tao bao cao
- Muc tieu: user report document/comment/question/answer.
- Ket qua: them `Reports`, ghi log.

### Xu ly bao cao
- Muc tieu: moderator/admin cap nhat trang thai report va an noi dung vi pham neu can.
- Ket qua: cap nhat `Reports`, co the doi `status` cua noi dung sang `hidden`.

### Xem bao cao cho xu ly
- Muc tieu: tong hop report pending/reviewed.
- Ket qua: `VIEW`.

## 6. Nhom thong ke va giam sat

### Thong ke dong gop nguoi dung
- Muc tieu: dem so tai lieu, binh luan, cau hoi, cau tra loi.
- Ket qua: `VIEW`.

### Tu dong cap nhat updatedAt
- Muc tieu: moi khi sua Users/Documents/Comments/Questions/Answers thi tu cap nhat thoi gian sua.
- Ket qua: `TRIGGER`.

## Phan TAM HOAN

Nhung nghiep vu sau tam thoi khong trien khai trong file business SQL hien tai:

- cong diem khi duyet tai lieu
- cong diem khi tra loi
- tru diem khi tai tai lieu
- dong bo `Users.points` tu `PointTransactions`
- xac dinh `AccessRules` theo diem
- mo/dong phien tai dua tren diem

Ly do:
- moderator se tu danh gia noi dung va cho diem theo muc danh gia rieng
- cong thuc tinh diem co the thay doi nhieu lan
- neu hard-code nghiep vu diem vao database luc nay se kho bao tri va kho dieu chinh sau nay
