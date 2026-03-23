# Mo ta chuc nang tung nghiep vu SQL Server

File nay mo ta ngan gon chuc nang cua cac nghiep vu hien dang duoc su dung trong database sau khi da ap dung:
1. `SQLQuery1.sql`
2. `DatabaseBusinessRules.sql`
3. `DatabaseBusinessRules_Patch01.sql`
4. `DatabaseBusinessRules_Patch02.sql`

## Tong quan hien tai

- 5 `VIEW`
- 20 `STORED PROCEDURE`
- 6 `TRIGGER`
- 0 rang buoc `accepted answer` dang hoat dong

Ghi chu:
- Co che `accepted answer` da bi loai bo.
- `Questions` hien duoc xem la thread "hoi tac gia".
- `Answers` hien duoc xem la cac tin nhan trao doi trong thread hoi dap.
- Realtime chat van la phan viec cua `BackEnd`, database chi luu thread va message.

## 1. View

### `vwApprovedDocumentSummary`
- Chuc nang: tong hop danh sach tai lieu da duyet.
- Du lieu tra ve:
  - thong tin tai lieu
  - nguoi dang
  - tong so category
  - tong so comment
  - tong so thread hoi dap
  - tong so tin nhan trao doi
- Muc dich dung:
  - hien thi danh sach tai lieu
  - tim kiem tai lieu
  - thong ke tong quan

### `vwDocumentReviewHistory`
- Chuc nang: xem lich su duyet cua tai lieu.
- Du lieu tra ve:
  - ma review
  - ma tai lieu
  - ten tai lieu
  - moderator duyet
  - quyet dinh duyet
  - ghi chu duyet
  - thoi gian duyet
- Muc dich dung:
  - trang moderator/admin
  - truy vet qua trinh kiem duyet

### `vwPendingReports`
- Chuc nang: tong hop cac bao cao dang cho xu ly hoac da reviewed.
- Du lieu tra ve:
  - nguoi bao cao
  - muc tieu bi bao cao
  - ly do
  - trang thai
  - nguoi xu ly
  - ghi chu xu ly
- Muc dich dung:
  - man hinh xu ly bao cao cho moderator/admin

### `vwUserContributionSummary`
- Chuc nang: thong ke dong gop noi dung cua moi nguoi dung.
- Du lieu tra ve:
  - tong so tai lieu
  - tong so comment
  - tong so thread hoi dap duoc mo
  - tong so tin nhan hoi dap da gui
- Muc dich dung:
  - thong ke nguoi dung
  - dashboard quan tri

### `vwQuestionConversationSummary`
- Chuc nang: tong hop danh sach thread hoi tac gia.
- Du lieu tra ve:
  - ma thread
  - tai lieu lien quan
  - tac gia
  - nguoi hoi
  - trang thai thread
  - tong so tin nhan sau cau hoi goc
- Muc dich dung:
  - hien thi danh sach hoi dap tren moi tai lieu
  - backend/frontend lay overview cac thread

## 2. Stored Procedure

## 2.1. Nhom tai khoan

### `usp_RegisterUser`
- Chuc nang: dang ky tai khoan moi.
- Xu ly chinh:
  - kiem tra email khong duoc trung
  - tao user moi voi role mac dinh hoac role duoc truyen vao
- Dau ra:
  - `userId`

### `usp_SetUserActiveStatus`
- Chuc nang: khoa hoac mo khoa tai khoan.
- Xu ly chinh:
  - cap nhat `isActive`
- Muc dich:
  - quan ly trang thai hoat dong cua nguoi dung

### `usp_VerifyUser`
- Chuc nang: danh dau tai khoan da duoc xac minh.
- Xu ly chinh:
  - cap nhat `isVerified = 1`

### `usp_GetUserProfile`
- Chuc nang: lay thong tin ho so co ban cua nguoi dung.
- Du lieu tra ve:
  - `userId`
  - `name`
  - `email`
  - `role`
  - `isActive`
  - `isVerified`
  - `createdAt`
  - `updatedAt`

### `usp_UpdateUserProfile`
- Chuc nang: cap nhat ho so nguoi dung.
- Xu ly chinh:
  - cho phep sua `name`
- Ghi chu:
  - email va password xu ly o nghiep vu rieng

## 2.2. Nhom tai lieu

### `usp_CreateDocument`
- Chuc nang: tao tai lieu moi.
- Xu ly chinh:
  - kiem tra owner dang hoat dong
  - tao tai lieu voi trang thai `pending`
  - gan category
  - ghi nhat ky hoat dong
- Dau ra:
  - `documentId`

### `usp_GetDocumentDetail`
- Chuc nang: lay chi tiet tai lieu.
- Du lieu tra ve:
  - thong tin tai lieu
  - thong tin tac gia

### `usp_SearchApprovedDocuments`
- Chuc nang: tim kiem tai lieu da duyet.
- Dieu kien tim:
  - theo tu khoa tieu de/mo ta
  - theo category
- Muc dich:
  - backend lay danh sach cho frontend

### `usp_UpdateDocument`
- Chuc nang: cap nhat metadata tai lieu.
- Xu ly chinh:
  - sua tieu de
  - sua mo ta
  - sua file URL
  - cap nhat category

### `usp_HideDocument`
- Chuc nang: an tai lieu bang cach chuyen `status = hidden`.
- Patch bo sung:
  - co them `@actorUserId = NULL`
  - neu co actor hop le thi ghi log `hide_document`
- Muc dich:
  - an tai lieu vi vi pham hoac theo nghiep vu quan tri

### `usp_FindDuplicateDocumentCandidates`
- Chuc nang: tim cac tai lieu cu hon co dau hieu trung lap voi mot tai lieu dang xet.
- Cach tim:
  - trung tieu de sau khi chuan hoa khoang trang
  - hoac trung `fileUrl`
- Dau ra:
  - danh sach tai lieu ung vien trung lap
  - ly do trung lap (`trung_title`, `trung_fileUrl`, `trung_title_va_fileUrl`)
- Ghi chu kien truc:
  - day chi la nghiep vu ho tro o muc metadata
  - ket luan cuoi cung ve "trung lap that su" nen xu ly o backend

## 2.3. Nhom kiem duyet

### `usp_ReviewDocument`
- Chuc nang: moderator/admin duyet tai lieu.
- Xu ly chinh:
  - kiem tra nguoi duyet la `moderator` hoac `admin`
  - chi duoc duyet tai lieu dang `pending`
  - them dong vao `DocumentReviews`
  - ghi `UserActivityLogs`
- Ket qua:
  - trigger se dong bo `Documents.status`

## 2.4. Nhom tuong tac noi dung

### `usp_CreateComment`
- Chuc nang: tao binh luan tren tai lieu.
- Xu ly chinh:
  - chi duoc comment tren tai lieu `approved`
  - user phai dang hoat dong
  - ghi `UserActivityLogs`
- Dau ra:
  - `commentId`

## 2.5. Nhom hoi tac gia / trao doi

### `usp_CreateQuestion`
- Chuc nang: mo mot thread "hoi tac gia" tren tai lieu.
- Xu ly chinh:
  - chi duoc mo thread tren tai lieu `approved`
  - user dat cau hoi phai dang hoat dong
  - nguoi hoi khong duoc la chinh tac gia
  - ghi `UserActivityLogs` voi action `create_question_thread`
- Dau ra:
  - `questionId`

### `usp_CreateAnswer`
- Chuc nang: gui mot tin nhan trong thread hoi dap.
- Xu ly chinh:
  - user gui tin phai dang hoat dong
  - thread phai dang `open`
  - chi `nguoi hoi` va `tac gia` moi duoc gui tin trong thread
  - ghi `UserActivityLogs` voi action `send_question_message`
- Dau ra:
  - `answerId`
- Ghi chu:
  - `Answers` hien khong con la dap an chap nhan
  - `Answers` duoc xem la message trong cuoc trao doi

### `usp_GetQuestionConversation`
- Chuc nang: lay toan bo thong tin mot thread hoi dap.
- Ket qua:
  - result set 1: thong tin thread
  - result set 2: lich su message trong thread
- Muc dich dung:
  - backend doc lich su thread
  - frontend hien thi giao dien chat

### `usp_CloseQuestionConversation`
- Chuc nang: dong thread hoi dap.
- Nguoi co quyen dong:
  - nguoi hoi
  - tac gia
  - moderator
  - admin
- Xu ly chinh:
  - chuyen `Questions.status = resolved`
  - ghi `UserActivityLogs`

### `usp_AcceptAnswer`
- Trang thai hien tai: nghiep vu nay da bi vo hieu hoa.
- Chuc nang hien tai:
  - khong thuc hien accept answer nua
  - khi goi se `THROW` loi nghiep vu
- Ly do:
  - he thong da chuyen sang mo hinh trao doi thread/chat, khong con logic "1 dap an duoc chap nhan"

## 2.6. Nhom bao cao vi pham

### `usp_CreateReport`
- Chuc nang: tao bao cao vi pham.
- Xu ly chinh:
  - user tao report cho `document`, `comment`, `question` hoac `answer`
  - user bao cao phai dang hoat dong
  - chi duoc chi ra dung 1 doi tuong bi bao cao
  - doi tuong bi bao cao phai ton tai
  - ghi `UserActivityLogs`
- Dau ra:
  - `reportId`

### `usp_ResolveReport`
- Chuc nang: xu ly bao cao vi pham.
- Xu ly chinh:
  - cap nhat trang thai `reviewed/resolved/dismissed`
  - luu nguoi xu ly, ghi chu va thoi diem xu ly
  - nguoi xu ly phai la `moderator/admin` va dang hoat dong
  - neu `@hideTarget = 1` va status = `resolved` thi an noi dung vi pham
  - ghi `UserActivityLogs`

## 3. Trigger

### `trg_DocumentReviews_SyncDocumentStatus`
- Chuc nang: dong bo trang thai hien tai cua tai lieu sau khi co review moi.
- Xu ly chinh:
  - doc du lieu tu `DocumentReviews`
  - cap nhat `Documents.status`
  - cap nhat `Documents.updatedAt`

### `trg_Users_SetUpdatedAt`
- Chuc nang: tu dong cap nhat `updatedAt` cho bang `Users` khi co sua doi.

### `trg_Documents_SetUpdatedAt`
- Chuc nang: tu dong cap nhat `updatedAt` cho bang `Documents` khi co sua doi.

### `trg_Comments_SetUpdatedAt`
- Chuc nang: tu dong cap nhat `updatedAt` cho bang `Comments` khi co sua doi.

### `trg_Questions_SetUpdatedAt`
- Chuc nang: tu dong cap nhat `updatedAt` cho bang `Questions` khi co sua doi.

### `trg_Answers_SetUpdatedAt`
- Chuc nang: tu dong cap nhat `updatedAt` cho bang `Answers` khi co sua doi.

## 4. Giai thich nghiep vu moi sau Patch02

### 4.1. Tai sao bo `accepted answer`
- Huong nghiep vu moi cua he thong khong con la hoi dap kieu forum "co 1 dap an dung nhat".
- Thay vao do:
  - nguoi dung bam nut `Tao cau hoi voi tac gia`
  - he thong mo mot thread trao doi
  - nguoi dung va tac gia nhan tin qua lai
  - moderator danh gia chat luong trao doi de cho diem hoac xu ly vi pham sau

### 4.2. Vai tro cua `Questions`
- Truoc day:
  - `Questions` la cau hoi trong he thong Q&A thong thuong
- Hien tai:
  - `Questions` la ban ghi dai dien cho 1 thread hoi tac gia
  - noi dung goc cua question la tin nhan mo dau thread

### 4.3. Vai tro cua `Answers`
- Truoc day:
  - `Answers` la cac cau tra loi cho question
- Hien tai:
  - `Answers` la cac tin nhan phan hoi trong thread
  - co the do tac gia gui hoac nguoi hoi gui
  - khong con kha niem answer duoc chap nhan

### 4.4. Realtime chat nen dat o dau
- Nghiệp vu luu du lieu thread va message: co the dat o database
- Nghiệp vu realtime:
  - push tin nhan ngay lap tuc
  - thong bao online/offline
  - danh dau da xem
  - socket rooms
  - retry / reconnect
- Nhung phan nay nen dat o backend bang `WebSocket` hoac `Socket.IO`

### 4.5. Kiem tra trung lap tai lieu nen dat o dau
- Nen xu ly chinh o `BackEnd`
- Ly do:
  - backend co the hash file
  - backend co the doc noi dung file
  - backend co the OCR neu la PDF scan
  - backend co the ap dung quy tac tuong dong linh hoat
- Database nen ho tro:
  - tim ung vien trung lap theo metadata
  - luu ket qua moderator kiem tra neu sau nay can mo rong

## 5. Nghiệp vu backend can luu y

### Khi an tai lieu
- Co the goi:
  - `EXEC dbo.usp_HideDocument @documentId = 1`
- Nen goi day du de co log:
  - `EXEC dbo.usp_HideDocument @documentId = 1, @actorUserId = 3`

### Khi tao thread hoi tac gia
- Backend nen hien nut `Tao cau hoi voi tac gia` tren tai lieu da `approved`.
- Backend nen chan tac gia tu mo thread voi chinh tai lieu cua minh.

### Khi hien giao dien chat
- Backend nen goi `usp_GetQuestionConversation` de lay lich su.
- Backend nen dung socket de day message realtime.
- Moi message moi duoc luu bang `usp_CreateAnswer`.

### Khi dong thread
- Khong dung `usp_AcceptAnswer` nua.
- Neu muon ket thuc trao doi, hay goi `usp_CloseQuestionConversation`.

### Khi kiem tra trung lap tai lieu
- Backend nen:
  - upload file
  - tao hash/noi dung trich xuat
  - goi `usp_FindDuplicateDocumentCandidates` de lay danh sach ung vien
  - tu quyet dinh co cho dang tiep hay huy bai dang

## 6. Ket luan

Bo nghiep vu hien tai tap trung vao:
- quan ly tai khoan co ban
- quan ly tai lieu
- kiem duyet tai lieu
- binh luan noi dung
- hoi tac gia theo mo hinh thread trao doi
- bao cao vi pham
- ho tro tim tai lieu co dau hieu trung lap
- dong bo du lieu va nhat ky hoat dong

Phan tinh diem, cong diem, rule truy cap theo diem va realtime socket van khong duoc xu ly truc tiep trong business layer SQL phase 1.
