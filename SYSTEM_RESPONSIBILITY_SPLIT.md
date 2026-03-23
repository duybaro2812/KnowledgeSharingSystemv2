# Phan Chia Nghiep Vu Theo Tung Mang

Muc tieu de tai co mot cach phan tach ro rang, de bao tri va de lap trinh sau nay.

## 1. Mang Quan Ly Tai Khoan

### SQL Server xu ly
- Dang ky tai khoan
- Khoa / mo khoa tai khoan
- Xac thuc tai khoan
- Luu thong tin nguoi dung

### BackEnd xu ly
- Dang nhap
- Dang xuat
- Hash password
- Tao JWT / session
- Phan quyen theo role
- Quen mat khau
- Lay lai / dat lai mat khau
- Doi mat khau
- Gui email xac thuc tai khoan
- Gui email reset password

### FrontEnd xu ly
- Form dang ky
- Form dang nhap
- Form quen mat khau
- Form dat lai mat khau
- Form doi mat khau
- Hien thi thong bao loi / thanh cong

### Giai thich
- SQL Server phu hop voi viec luu va cap nhat du lieu tai khoan.
- BackEnd phu hop voi cac nghiep vu bao mat va xac thuc.
- FrontEnd chi phu trach giao dien va nhap lieu.

## 2. Mang Quan Ly Tai Lieu

### SQL Server xu ly
- Tao tai lieu
- Cap nhat tai lieu
- An tai lieu
- Gan danh muc cho tai lieu
- Lay danh sach tai lieu da duyet qua `VIEW`
- Lay thong tin tong hop tai lieu

### BackEnd xu ly
- Xu ly upload file
- Kiem tra loai file, kich thuoc file
- Luu file vao thu muc local hoac cloud
- Tao `fileUrl`
- Validate request upload

### FrontEnd xu ly
- Form dang tai lieu
- Form sua tai lieu
- Danh sach tai lieu
- Chi tiet tai lieu
- Tim kiem / loc / sap xep tai lieu

### Giai thich
- SQL Server quan ly metadata va quan he giua tai lieu voi category.
- BackEnd quan ly file that su.
- FrontEnd hien thi va cho phep nguoi dung thao tac.

## 3. Mang Kiem Duyet Tai Lieu

### SQL Server xu ly
- Duyet tai lieu
- Tu choi tai lieu
- Luu lich su duyet vao `DocumentReviews`
- Dong bo trang thai hien tai cua tai lieu
- Lay lich su duyet qua `VIEW`

### BackEnd xu ly
- Kiem tra nguoi thao tac co role `moderator` / `admin`
- Dieu phoi request duyet
- Ghi log he thong muc ung dung neu can

### FrontEnd xu ly
- Man hinh danh sach tai lieu cho duyet
- Form / popup duyet tai lieu
- Hien thi ghi chu duyet / ly do tu choi

### Giai thich
- Nghiep vu duyet mang tinh giao dich du lieu, dat o SQL Server la hop ly.
- BackEnd bo sung kiem tra quyen va xu ly request.

## 4. Mang Tuong Tac Tri Thuc

### SQL Server xu ly
- Tao binh luan
- Tao cau hoi
- Tao cau tra loi
- Chap nhan cau tra loi
- Cap nhat trang thai cau hoi khi da co cau tra loi duoc chap nhan
- Dam bao moi cau hoi chi co toi da 1 cau tra loi accepted

### BackEnd xu ly
- Validate noi dung dau vao
- Chan spam / gioi han tan suat neu can
- Kiem tra quyen thao tac o muc request

### FrontEnd xu ly
- Form binh luan
- Form dat cau hoi
- Form tra loi
- Hien thi danh sach question / answer
- Hien thi dap an duoc chap nhan

### Giai thich
- SQL Server can giu toan ven du lieu hoi dap.
- BackEnd va FrontEnd phu trach luong tuong tac va trai nghiem nguoi dung.

## 5. Mang Bao Cao Vi Pham

### SQL Server xu ly
- Tao bao cao
- Xu ly bao cao
- An noi dung vi pham neu can
- Luu nguoi xu ly, ghi chu xu ly, thoi diem xu ly
- Tong hop report cho moderator/admin qua `VIEW`

### BackEnd xu ly
- Kiem tra quyen xu ly report
- Dieu phoi request report / resolve report
- Thong bao den moderator neu can

### FrontEnd xu ly
- Nut / form report vi pham
- Man hinh moderator xem report
- Form xu ly report

### Giai thich
- SQL Server xu ly phan cap nhat trang thai report va noi dung vi pham.
- BackEnd va FrontEnd xu ly luong thao tac cua nguoi dung va moderator.

## 6. Mang Diem Va Danh Gia Noi Dung

### SQL Server xu ly
- Tam thoi khong dat business logic tinh diem vao SQL Server

### BackEnd xu ly
- Moderator dat quy tac danh gia
- Moderator cham diem bai dang
- Moderator cham diem binh luan
- Moderator cham diem cau hoi
- Moderator cham diem cau tra loi
- Cong / tru diem theo muc danh gia
- Thay doi cong thuc tinh diem trong tuong lai

### FrontEnd xu ly
- Man hinh moderator cham diem
- Man hinh xem lich su danh gia
- Form nhap nhan xet va muc diem

### Giai thich
- Day la phan nghiep vu thay doi linh hoat nhat.
- Neu hard-code trong SQL Server se kho sua doi sau nay.
- Vi vay nen dat o BackEnd de de mo rong va bao tri.

## 7. Mang Quen Mat Khau / Lay Lai Mat Khau

### SQL Server xu ly
- Neu can, chi luu du lieu phuc vu reset password
- Vi du: reset token, han su dung, trang thai da dung / chua dung
- Cap nhat `passwordHash` khi reset thanh cong

### BackEnd xu ly
- Tao token reset password
- Kiem tra token hop le
- Kiem tra token con han
- Gui email reset password
- Xu ly dat lai mat khau moi

### FrontEnd xu ly
- Form nhap email quen mat khau
- Form dat lai mat khau moi
- Thong bao reset thanh cong / that bai

### Giai thich
- Nghiep vu nay nen dat chu yeu o BackEnd vi lien quan den email, token, bao mat va HTTP flow.

## 8. Mang Thong Ke Va Giam Sat

### SQL Server xu ly
- View tong hop tai lieu da duyet
- View tong hop lich su duyet
- View tong hop report cho xu ly
- View thong ke dong gop nguoi dung
- Trigger cap nhat `updatedAt`
- Luu `UserActivityLogs`

### BackEnd xu ly
- Tong hop du lieu tu nhieu nguon API
- Gioi han quyen xem thong ke
- Xuat du lieu theo nhu cau giao dien

### FrontEnd xu ly
- Dashboard
- Bang thong ke
- Bieu do
- Bo loc thoi gian / danh muc / nguoi dung

### Giai thich
- SQL Server lam tot vai tro tong hop va truy van thong ke.
- BackEnd va FrontEnd chuyen ket qua thanh API va giao dien de doc.

## 9. Mang Upload File Va Quan Ly Tep

### SQL Server xu ly
- Luu `fileUrl`
- Luu metadata lien quan den tai lieu

### BackEnd xu ly
- Nhan file upload
- Luu file vao bo nho / o dia / cloud
- Dat ten file
- Tao duong dan truy cap file
- Kiem tra file hop le

### FrontEnd xu ly
- Form chon file
- Hien thi tien trinh upload
- Hien thi loi upload

### Giai thich
- SQL Server khong phai noi phu hop de xu ly file thuc te.
- SQL Server chi nen luu duong dan va metadata.

## 10. Ket Luan Chot

### SQL Server se xu ly tot nhat
- Du lieu cot loi
- Quan he giua cac bang
- Toan ven du lieu
- Nghiep vu CRUD co rang buoc
- Kiem duyet
- Bao cao vi pham
- Thong ke du lieu
- Trigger dong bo trang thai / updatedAt

### BackEnd se xu ly tot nhat
- Bao mat
- Dang nhap / JWT / session
- Quen mat khau / reset password
- Upload file
- Phan quyen
- Nghiep vu diem linh hoat
- Gui email / OTP / token

### FrontEnd se xu ly tot nhat
- Form nhap lieu
- Hien thi danh sach / chi tiet
- Tim kiem / loc / sap xep
- Dashboard / bieu do
- Thong bao trang thai cho nguoi dung

## 11. Huong Chot Cho De Tai Hien Tai

Neu muc tieu cua ban la hoan thanh phan database trong hom nay, thi co the chot nhu sau:

- SQL Server: lam xong phan tai khoan co ban, tai lieu, kiem duyet, hoi dap, bao cao, thong ke
- BackEnd: de sau, se lam phan dang nhap, quen mat khau, diem, upload file
- FrontEnd: de sau, se lam giao dien thao tac

Huong nay la hop ly, ro trach nhiem va de bao tri ve sau.
