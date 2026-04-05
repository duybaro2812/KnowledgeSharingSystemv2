# Notification Catalog

Tai lieu nay giup FrontEnd map `notification.type` sang icon, mau, route va nhom hien thi.

## Nguyen Tac Chung

- Uu tien dieu huong theo:
  1. `notification.metadata.route`
  2. `notification.targetRoute`
  3. target fallback theo `metadata.target`
- Nhung type duoi day la danh sach type dang duoc backend phat ra trong code.

## De Xuat Nhom Mau/Icon

- `success`
  - mau: xanh la
  - icon: check-circle
- `warning`
  - mau: vang/cam
  - icon: alert-triangle
- `danger`
  - mau: do
  - icon: shield-alert / ban
- `info`
  - mau: xanh duong
  - icon: bell / info
- `moderation`
  - mau: tim/xam dam
  - icon: gavel / shield

## Document Review

- `document_upload_success`
  - nhom: success
  - y nghia: tai lieu duoc duyet
- `document_upload_rejected`
  - nhom: danger
  - y nghia: tai lieu bi tu choi
- `document_rejected`
  - nhom: danger
  - y nghia: moderator reject tai lieu
- `document_locked`
  - nhom: warning
  - y nghia: tai lieu bi khoa
- `document_unlocked`
  - nhom: success
  - y nghia: tai lieu duoc mo lai
- `document_deleted`
  - nhom: danger
  - y nghia: tai lieu bi xoa
- `document_auto_locked`
  - nhom: warning
  - y nghia: tai lieu bi auto-lock do report

## Report Flow

- `document_reported`
  - nhom: moderation
  - nguoi nhan: moderator/admin
- `report_resolved_unlocked`
  - nhom: success
  - nguoi nhan: reporter
- `report_resolved_deleted`
  - nhom: success
  - nguoi nhan: reporter

## Plagiarism / Duplicate

- `plagiarism_suspected`
  - nhom: danger
  - nguoi nhan: moderator/admin
  - metadata quan trong:
    - `plagiarismPercent`
    - `comparedDocumentId`
    - `comparedDocumentTitle`
    - `comparedDocumentRoute`
    - `links`
- `plagiarism_rechecked`
  - nhom: info
  - nguoi nhan: moderator/admin
- `plagiarism_approved_anyway`
  - nhom: warning
  - nguoi nhan: owner
- `plagiarism_rejected_duplicate`
  - nhom: danger
  - nguoi nhan: owner

## Comment Flow

- `comment_pending_moderation`
  - nhom: moderation
  - nguoi nhan: moderator/admin
- `comment_reply_pending_moderation`
  - nhom: moderation
  - nguoi nhan: moderator/admin
- `comment_approved`
  - nhom: success
  - nguoi nhan: nguoi viet comment
- `comment_rejected`
  - nhom: danger
  - nguoi nhan: nguoi viet comment
- `document_comment_approved`
  - nhom: info
  - nguoi nhan: owner tai lieu
- `comment_reply_approved`
  - nhom: info
  - nguoi nhan: nguoi bi reply
- `comment_points_pending_review`
  - nhom: moderation
  - nguoi nhan: moderator/admin

## Q&A Flow

- `qa_session_opened`
  - nhom: info
  - nguoi nhan: owner tai lieu
- `qa_session_message`
  - nhom: info
  - nguoi nhan: doi phuong trong session
- `qa_session_closed`
  - nhom: info
  - nguoi nhan: doi phuong trong session
- `qa_rating_pending_review`
  - nhom: moderation
  - nguoi nhan: moderator/admin

## Engagement Flow

- `document_liked`
  - nhom: success
  - nguoi nhan: owner tai lieu
- `document_disliked`
  - nhom: warning
  - nguoi nhan: owner tai lieu
- `document_saved`
  - nhom: info
  - nguoi nhan: owner tai lieu
- `point_event_pending_review`
  - nhom: moderation
  - nguoi nhan: moderator/admin

## Point Review Flow

- `point_event_approved`
  - nhom: success
  - nguoi nhan: user duoc cong/tru diem
- `point_event_rejected`
  - nhom: warning
  - nguoi nhan: user co event bi tu choi

## User/Admin Flow

- `account_locked`
  - nhom: danger
  - nguoi nhan: user
- `account_unlocked`
  - nhom: success
  - nguoi nhan: user
- `account_soft_deleted`
  - nhom: danger
  - nguoi nhan: user
- `role_promoted_moderator`
  - nhom: success
  - nguoi nhan: user
- `role_changed_user`
  - nhom: warning
  - nguoi nhan: user

## Mapping Route Goi Y

- `target.type = document`
  - route: `/documents/:id`
- `target.type = comment`
  - route: `/documents/:documentId?commentId=:commentId`
- `target.type = qa_session`
  - route: `/qa-sessions/:id`
- `target.type = point_event`
  - route: `/points`
- `target.type = moderation_queue`
  - route: `/moderation?...`
- `target.type = user`
  - route: `/profile`

## Goi Y Hien Thi UI

- Notification dropdown:
  - title
  - message
  - time ago
  - unread dot
  - icon theo nhom
- Notification click:
  - mark read
  - dieu huong theo `metadata.route`
- Moderator duplicate notification:
  - neu co `metadata.links[0]`
  - render ten tai lieu doi chieu thanh link bam duoc

## Ghi Chu

- Neu sau nay backend them notification type moi, FE nen co fallback:
  - nhom: `info`
  - icon: `bell`
  - route: `/notifications`

