/*
    DatabaseBusinessRules.sql

    Muc tieu:
    - Xay dung business logic cho phan noi dung, kiem duyet, bao cao
    - Khong trien khai nghiep vu tinh diem trong file nay
    - Phan diem se duoc tach rieng de moderator co the danh gia linh hoat sau nay

    Thu tu chay:
    1. Chay SQLQuery1.sql de tao schema
    2. Neu can, chay DropDatabaseBusinessRules.sql de xoa business logic cu
    3. Chay file nay de tao business logic moi
*/

SET NOCOUNT ON;
GO

/* =========================================================
   PHAN A - RANG BUOC BO SUNG
   ========================================================= */

/*
    Nghiep vu: Moi cau hoi chi duoc co toi da 1 cau tra loi duoc chap nhan.
    Giai thich:
    - Dung filtered unique index de ep buoc nghiep vu o tang database.
    - Neu co hon 1 cau tra loi accepted cho cung 1 question thi se bi chan.
*/
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_Answers_OneAcceptedPerQuestion'
      AND object_id = OBJECT_ID(N'dbo.Answers')
)
BEGIN
    CREATE UNIQUE INDEX UX_Answers_OneAcceptedPerQuestion
        ON dbo.Answers(questionId)
        WHERE isAccepted = 1;
END;
GO

/* =========================================================
   PHAN B - VIEW PHUC VU DOC DU LIEU / THONG KE
   ========================================================= */

/*
    Nghiep vu: Xem danh sach tai lieu da duyet.
    Giai thich:
    - Tong hop tai lieu approved de phuc vu man hinh danh sach / tim kiem / thong ke.
    - Kem theo thong tin nguoi dang va so luong tuong tac.
*/
CREATE OR ALTER VIEW dbo.vwApprovedDocumentSummary
AS
SELECT
    d.documentId,
    d.title,
    d.description,
    d.fileUrl,
    d.status,
    d.createdAt,
    d.updatedAt,
    u.userId AS ownerUserId,
    u.name AS ownerName,
    COUNT(DISTINCT dc.categoryId) AS totalCategories,
    COUNT(DISTINCT c.commentId) AS totalComments,
    COUNT(DISTINCT q.questionId) AS totalQuestions,
    COUNT(DISTINCT a.answerId) AS totalAnswers
FROM dbo.Documents d
INNER JOIN dbo.Users u ON u.userId = d.ownerUserId
LEFT JOIN dbo.DocumentCategories dc ON dc.documentId = d.documentId
LEFT JOIN dbo.Comments c
    ON c.documentId = d.documentId
   AND c.status = N'active'
LEFT JOIN dbo.Questions q
    ON q.documentId = d.documentId
   AND q.status <> N'hidden'
LEFT JOIN dbo.Answers a
    ON a.questionId = q.questionId
   AND a.status = N'active'
WHERE d.status = N'approved'
GROUP BY
    d.documentId,
    d.title,
    d.description,
    d.fileUrl,
    d.status,
    d.createdAt,
    d.updatedAt,
    u.userId,
    u.name;
GO

/*
    Nghiep vu: Xem lich su duyet tai lieu.
    Giai thich:
    - Tong hop danh sach review theo tai lieu, moderator va quyet dinh duyet.
    - Huu ich cho man hinh kiem duyet va truy vet lich su.
*/
CREATE OR ALTER VIEW dbo.vwDocumentReviewHistory
AS
SELECT
    dr.reviewId,
    dr.documentId,
    d.title AS documentTitle,
    dr.moderatorUserId,
    u.name AS moderatorName,
    dr.decision,
    dr.note,
    dr.createdAt
FROM dbo.DocumentReviews dr
INNER JOIN dbo.Documents d ON d.documentId = dr.documentId
INNER JOIN dbo.Users u ON u.userId = dr.moderatorUserId;
GO

/*
    Nghiep vu: Xem bao cao dang cho xu ly.
    Giai thich:
    - Moderator/Admin co the xem nhanh cac report pending/reviewed.
    - Kem theo thong tin nguoi bao cao va nguoi xu ly neu da co.
*/
CREATE OR ALTER VIEW dbo.vwPendingReports
AS
SELECT
    r.reportId,
    r.reporterUserId,
    ru.name AS reporterName,
    r.documentId,
    r.commentId,
    r.questionId,
    r.answerId,
    r.reason,
    r.status,
    r.createdAt,
    r.reviewedByUserId,
    mu.name AS reviewerName,
    r.reviewNote,
    r.reviewedAt
FROM dbo.Reports r
INNER JOIN dbo.Users ru ON ru.userId = r.reporterUserId
LEFT JOIN dbo.Users mu ON mu.userId = r.reviewedByUserId
WHERE r.status IN (N'pending', N'reviewed');
GO

/*
    Nghiep vu: Thong ke dong gop noi dung cua nguoi dung.
    Giai thich:
    - Chi thong ke so luong tai lieu, binh luan, cau hoi, cau tra loi.
    - Khong tinh diem trong view nay.
*/
CREATE OR ALTER VIEW dbo.vwUserContributionSummary
AS
SELECT
    u.userId,
    u.name,
    COUNT(DISTINCT d.documentId) AS totalDocuments,
    COUNT(DISTINCT c.commentId) AS totalComments,
    COUNT(DISTINCT q.questionId) AS totalQuestions,
    COUNT(DISTINCT a.answerId) AS totalAnswers
FROM dbo.Users u
LEFT JOIN dbo.Documents d ON d.ownerUserId = u.userId
LEFT JOIN dbo.Comments c ON c.authorUserId = u.userId
LEFT JOIN dbo.Questions q ON q.askerUserId = u.userId
LEFT JOIN dbo.Answers a ON a.responderUserId = u.userId
GROUP BY
    u.userId,
    u.name;
GO

/* =========================================================
   PHAN C - TRIGGER
   ========================================================= */

/*
    Nghiep vu: Dong bo trang thai hien hanh cua tai lieu sau moi lan review.
    Giai thich:
    - Bang DocumentReviews luu lich su.
    - Bang Documents luu trang thai hien tai.
*/
CREATE OR ALTER TRIGGER dbo.trg_DocumentReviews_SyncDocumentStatus
ON dbo.DocumentReviews
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE d
    SET
        d.status = i.decision,
        d.updatedAt = SYSDATETIME()
    FROM dbo.Documents d
    INNER JOIN inserted i ON i.documentId = d.documentId;
END;
GO

/*
    Nghiep vu: Tu dong cap nhat updatedAt cho Users.
*/
CREATE OR ALTER TRIGGER dbo.trg_Users_SetUpdatedAt
ON dbo.Users
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF UPDATE(updatedAt)
        RETURN;

    UPDATE u
    SET updatedAt = SYSDATETIME()
    FROM dbo.Users u
    INNER JOIN inserted i ON i.userId = u.userId;
END;
GO

/*
    Nghiep vu: Tu dong cap nhat updatedAt cho Documents.
*/
CREATE OR ALTER TRIGGER dbo.trg_Documents_SetUpdatedAt
ON dbo.Documents
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF UPDATE(updatedAt)
        RETURN;

    UPDATE d
    SET updatedAt = SYSDATETIME()
    FROM dbo.Documents d
    INNER JOIN inserted i ON i.documentId = d.documentId;
END;
GO

/*
    Nghiep vu: Tu dong cap nhat updatedAt cho Comments.
*/
CREATE OR ALTER TRIGGER dbo.trg_Comments_SetUpdatedAt
ON dbo.Comments
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF UPDATE(updatedAt)
        RETURN;

    UPDATE c
    SET updatedAt = SYSDATETIME()
    FROM dbo.Comments c
    INNER JOIN inserted i ON i.commentId = c.commentId;
END;
GO

/*
    Nghiep vu: Tu dong cap nhat updatedAt cho Questions.
*/
CREATE OR ALTER TRIGGER dbo.trg_Questions_SetUpdatedAt
ON dbo.Questions
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF UPDATE(updatedAt)
        RETURN;

    UPDATE q
    SET updatedAt = SYSDATETIME()
    FROM dbo.Questions q
    INNER JOIN inserted i ON i.questionId = q.questionId;
END;
GO

/*
    Nghiep vu: Tu dong cap nhat updatedAt cho Answers.
*/
CREATE OR ALTER TRIGGER dbo.trg_Answers_SetUpdatedAt
ON dbo.Answers
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF UPDATE(updatedAt)
        RETURN;

    UPDATE a
    SET updatedAt = SYSDATETIME()
    FROM dbo.Answers a
    INNER JOIN inserted i ON i.answerId = a.answerId;
END;
GO

/* =========================================================
   PHAN D - STORED PROCEDURE NHOM TAI KHOAN
   ========================================================= */

/*
    Nghiep vu: Dang ky tai khoan.
    Muc tieu:
    - Tao user moi.
    - Email khong duoc trung.
*/
CREATE OR ALTER PROCEDURE dbo.usp_RegisterUser
    @name NVARCHAR(100),
    @email NVARCHAR(150),
    @passwordHash NVARCHAR(255),
    @role NVARCHAR(20) = N'user'
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM dbo.Users WHERE email = @email)
    BEGIN
        THROW 55001, N'Email da ton tai.', 1;
    END;

    INSERT INTO dbo.Users (name, email, passwordHash, role)
    VALUES (@name, @email, @passwordHash, @role);

    SELECT CAST(SCOPE_IDENTITY() AS INT) AS userId;
END;
GO

/*
    Nghiep vu: Khoa / mo khoa tai khoan.
    Muc tieu:
    - Quan tri trang thai hoat dong cua user.
*/
CREATE OR ALTER PROCEDURE dbo.usp_SetUserActiveStatus
    @userId INT,
    @isActive BIT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Users
    SET isActive = @isActive
    WHERE userId = @userId;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 55002, N'Nguoi dung khong ton tai.', 1;
    END;
END;
GO

/*
    Nghiep vu: Xac thuc tai khoan.
    Muc tieu:
    - Danh dau user da duoc xac minh.
*/
CREATE OR ALTER PROCEDURE dbo.usp_VerifyUser
    @userId INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Users
    SET isVerified = 1
    WHERE userId = @userId;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 55003, N'Nguoi dung khong ton tai.', 1;
    END;
END;
GO

/*
    Nghiep vu: Xem thong tin ho so nguoi dung.
    Muc tieu:
    - Lay thong tin co ban cua 1 user de hien thi ho so.
*/
CREATE OR ALTER PROCEDURE dbo.usp_GetUserProfile
    @userId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        userId,
        name,
        email,
        role,
        isActive,
        isVerified,
        createdAt,
        updatedAt
    FROM dbo.Users
    WHERE userId = @userId;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 55004, N'Nguoi dung khong ton tai.', 1;
    END;
END;
GO

/*
    Nghiep vu: Cap nhat ho so nguoi dung.
    Muc tieu:
    - Cho phep sua ten hien thi.
    - Phan email / password xu ly o nghiep vu rieng.
*/
CREATE OR ALTER PROCEDURE dbo.usp_UpdateUserProfile
    @userId INT,
    @name NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Users
    SET name = @name
    WHERE userId = @userId;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 55005, N'Nguoi dung khong ton tai.', 1;
    END;
END;
GO

/* =========================================================
   PHAN E - STORED PROCEDURE NHOM TAI LIEU
   ========================================================= */

/*
    Nghiep vu: Tao tai lieu moi.
    Muc tieu:
    - User tao bai dang tai lieu.
    - Tai lieu moi o trang thai pending.
    - Co the gan nhieu category.
    - Ghi nhat ky hoat dong.
*/
CREATE OR ALTER PROCEDURE dbo.usp_CreateDocument
    @ownerUserId INT,
    @title NVARCHAR(255),
    @description NVARCHAR(MAX) = NULL,
    @fileUrl NVARCHAR(500),
    @categoryIds NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Users
        WHERE userId = @ownerUserId
          AND isActive = 1
    )
    BEGIN
        THROW 55101, N'Nguoi dung khong hop le hoac da bi khoa.', 1;
    END;

    IF @categoryIds IS NOT NULL AND LTRIM(RTRIM(@categoryIds)) <> N''
       AND EXISTS (
            SELECT 1
            FROM STRING_SPLIT(@categoryIds, N',') s
            WHERE TRY_CAST(s.value AS INT) IS NULL
               OR NOT EXISTS (
                    SELECT 1
                    FROM dbo.Categories c
                    WHERE c.categoryId = TRY_CAST(s.value AS INT)
               )
       )
    BEGIN
        THROW 55104, N'Danh muc khong hop le.', 1;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        INSERT INTO dbo.Documents (
            ownerUserId,
            title,
            description,
            fileUrl,
            status
        )
        VALUES (
            @ownerUserId,
            @title,
            @description,
            @fileUrl,
            N'pending'
        );

        DECLARE @documentId INT = CAST(SCOPE_IDENTITY() AS INT);

        IF @categoryIds IS NOT NULL AND LTRIM(RTRIM(@categoryIds)) <> N''
        BEGIN
            INSERT INTO dbo.DocumentCategories (documentId, categoryId)
            SELECT DISTINCT @documentId, TRY_CAST(value AS INT)
            FROM STRING_SPLIT(@categoryIds, N',')
            WHERE TRY_CAST(value AS INT) IS NOT NULL;
        END;

        INSERT INTO dbo.UserActivityLogs (userId, action, targetType, targetId)
        VALUES (@ownerUserId, N'create_document', N'document', @documentId);

        COMMIT TRANSACTION;

        SELECT @documentId AS documentId;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

/*
    Nghiep vu: Xem chi tiet tai lieu.
    Muc tieu:
    - Lay thong tin day du cua 1 tai lieu cung thong tin nguoi dang.
*/
CREATE OR ALTER PROCEDURE dbo.usp_GetDocumentDetail
    @documentId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        d.documentId,
        d.title,
        d.description,
        d.fileUrl,
        d.status,
        d.createdAt,
        d.updatedAt,
        u.userId AS ownerUserId,
        u.name AS ownerName,
        u.email AS ownerEmail
    FROM dbo.Documents d
    INNER JOIN dbo.Users u ON u.userId = d.ownerUserId
    WHERE d.documentId = @documentId;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 55105, N'Tai lieu khong ton tai.', 1;
    END;
END;
GO

/*
    Nghiep vu: Tim kiem tai lieu da duyet.
    Muc tieu:
    - Tim theo tu khoa tieu de/mo ta.
    - Loc theo category neu can.
*/
CREATE OR ALTER PROCEDURE dbo.usp_SearchApprovedDocuments
    @keyword NVARCHAR(255) = NULL,
    @categoryId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT
        d.documentId,
        d.title,
        d.description,
        d.fileUrl,
        d.createdAt,
        d.updatedAt,
        u.userId AS ownerUserId,
        u.name AS ownerName
    FROM dbo.Documents d
    INNER JOIN dbo.Users u ON u.userId = d.ownerUserId
    LEFT JOIN dbo.DocumentCategories dc ON dc.documentId = d.documentId
    WHERE d.status = N'approved'
      AND (
            @keyword IS NULL
            OR d.title LIKE N'%' + @keyword + N'%'
            OR d.description LIKE N'%' + @keyword + N'%'
      )
      AND (
            @categoryId IS NULL
            OR dc.categoryId = @categoryId
      )
    ORDER BY d.createdAt DESC;
END;
GO

/*
    Nghiep vu: Cap nhat tai lieu.
    Muc tieu:
    - Sua title, description, fileUrl, category.
*/
CREATE OR ALTER PROCEDURE dbo.usp_UpdateDocument
    @documentId INT,
    @title NVARCHAR(255),
    @description NVARCHAR(MAX) = NULL,
    @fileUrl NVARCHAR(500),
    @categoryIds NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Documents WHERE documentId = @documentId)
    BEGIN
        THROW 55102, N'Tai lieu khong ton tai.', 1;
    END;

    IF @categoryIds IS NOT NULL AND LTRIM(RTRIM(@categoryIds)) <> N''
       AND EXISTS (
            SELECT 1
            FROM STRING_SPLIT(@categoryIds, N',') s
            WHERE TRY_CAST(s.value AS INT) IS NULL
               OR NOT EXISTS (
                    SELECT 1
                    FROM dbo.Categories c
                    WHERE c.categoryId = TRY_CAST(s.value AS INT)
               )
       )
    BEGIN
        THROW 55106, N'Danh muc khong hop le.', 1;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.Documents
        SET
            title = @title,
            description = @description,
            fileUrl = @fileUrl
        WHERE documentId = @documentId;

        DELETE FROM dbo.DocumentCategories
        WHERE documentId = @documentId;

        IF @categoryIds IS NOT NULL AND LTRIM(RTRIM(@categoryIds)) <> N''
        BEGIN
            INSERT INTO dbo.DocumentCategories (documentId, categoryId)
            SELECT DISTINCT @documentId, TRY_CAST(value AS INT)
            FROM STRING_SPLIT(@categoryIds, N',')
            WHERE TRY_CAST(value AS INT) IS NOT NULL;
        END;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

/*
    Nghiep vu: An tai lieu.
    Muc tieu:
    - Khong xoa cung, chi an bang status = hidden.
*/
CREATE OR ALTER PROCEDURE dbo.usp_HideDocument
    @documentId INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Documents
    SET status = N'hidden'
    WHERE documentId = @documentId;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 55103, N'Tai lieu khong ton tai.', 1;
    END;
END;
GO

/* =========================================================
   PHAN F - STORED PROCEDURE NHOM KIEM DUYET
   ========================================================= */

/*
    Nghiep vu: Duyet tai lieu.
    Muc tieu:
    - Moderator/Admin danh gia tai lieu la approved hay rejected.
    - Them ban ghi vao DocumentReviews.
    - Trigger se dong bo Documents.status.

    Luu y:
    - Procedure nay KHONG xu ly cong diem.
*/
CREATE OR ALTER PROCEDURE dbo.usp_ReviewDocument
    @documentId INT,
    @moderatorUserId INT,
    @decision NVARCHAR(20),
    @note NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @decision NOT IN (N'approved', N'rejected')
    BEGIN
        THROW 55201, N'Decision khong hop le.', 1;
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Users
        WHERE userId = @moderatorUserId
          AND role IN (N'moderator', N'admin')
          AND isActive = 1
    )
    BEGIN
        THROW 55202, N'Nguoi duyet khong hop le.', 1;
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Documents WHERE documentId = @documentId)
    BEGIN
        THROW 55203, N'Tai lieu khong ton tai.', 1;
    END;

    INSERT INTO dbo.DocumentReviews (documentId, moderatorUserId, decision, note)
    VALUES (@documentId, @moderatorUserId, @decision, @note);

    INSERT INTO dbo.UserActivityLogs (userId, action, targetType, targetId)
    VALUES (@moderatorUserId, N'review_document', N'document', @documentId);
END;
GO

/* =========================================================
   PHAN G - STORED PROCEDURE NHOM TUONG TAC TRI THUC
   ========================================================= */

/*
    Nghiep vu: Tao binh luan.
    Muc tieu:
    - Chi cho phep binh luan tren tai lieu da approved.
*/
CREATE OR ALTER PROCEDURE dbo.usp_CreateComment
    @documentId INT,
    @authorUserId INT,
    @content NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Documents
        WHERE documentId = @documentId
          AND status = N'approved'
    )
    BEGIN
        THROW 55301, N'Chi duoc binh luan tren tai lieu da approved.', 1;
    END;

    INSERT INTO dbo.Comments (documentId, authorUserId, content)
    VALUES (@documentId, @authorUserId, @content);

    DECLARE @commentId INT = CAST(SCOPE_IDENTITY() AS INT);

    INSERT INTO dbo.UserActivityLogs (userId, action, targetType, targetId)
    VALUES (@authorUserId, N'create_comment', N'comment', @commentId);

    SELECT @commentId AS commentId;
END;
GO

/*
    Nghiep vu: Tao cau hoi.
    Muc tieu:
    - Dat cau hoi tren tai lieu da approved.
*/
CREATE OR ALTER PROCEDURE dbo.usp_CreateQuestion
    @documentId INT,
    @askerUserId INT,
    @content NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Documents
        WHERE documentId = @documentId
          AND status = N'approved'
    )
    BEGIN
        THROW 55302, N'Chi duoc dat cau hoi tren tai lieu da approved.', 1;
    END;

    INSERT INTO dbo.Questions (documentId, askerUserId, content)
    VALUES (@documentId, @askerUserId, @content);

    DECLARE @questionId INT = CAST(SCOPE_IDENTITY() AS INT);

    INSERT INTO dbo.UserActivityLogs (userId, action, targetType, targetId)
    VALUES (@askerUserId, N'create_question', N'question', @questionId);

    SELECT @questionId AS questionId;
END;
GO

/*
    Nghiep vu: Tao cau tra loi.
    Muc tieu:
    - Tra loi cho cau hoi hop le.
    - Chi ghi noi dung va log, KHONG cong diem.
*/
CREATE OR ALTER PROCEDURE dbo.usp_CreateAnswer
    @questionId INT,
    @responderUserId INT,
    @content NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Questions
        WHERE questionId = @questionId
          AND status IN (N'open', N'resolved')
    )
    BEGIN
        THROW 55303, N'Cau hoi khong ton tai hoac da bi an.', 1;
    END;

    INSERT INTO dbo.Answers (questionId, responderUserId, content)
    VALUES (@questionId, @responderUserId, @content);

    DECLARE @answerId INT = CAST(SCOPE_IDENTITY() AS INT);

    INSERT INTO dbo.UserActivityLogs (userId, action, targetType, targetId)
    VALUES (@responderUserId, N'create_answer', N'answer', @answerId);

    SELECT @answerId AS answerId;
END;
GO

/*
    Nghiep vu: Chap nhan cau tra loi.
    Muc tieu:
    - Moi cau hoi chi co 1 answer accepted.
    - Khi chap nhan thi cau hoi chuyen sang resolved.
*/
CREATE OR ALTER PROCEDURE dbo.usp_AcceptAnswer
    @questionId INT,
    @answerId INT,
    @moderatorUserId INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Users
        WHERE userId = @moderatorUserId
          AND role IN (N'moderator', N'admin')
          AND isActive = 1
    )
    BEGIN
        THROW 55304, N'Nguoi thuc hien khong hop le.', 1;
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Answers
        WHERE answerId = @answerId
          AND questionId = @questionId
          AND status = N'active'
    )
    BEGIN
        THROW 55305, N'Cau tra loi khong hop le.', 1;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.Answers
        SET isAccepted = 0
        WHERE questionId = @questionId
          AND isAccepted = 1;

        UPDATE dbo.Answers
        SET isAccepted = 1
        WHERE answerId = @answerId;

        UPDATE dbo.Questions
        SET status = N'resolved'
        WHERE questionId = @questionId;

        INSERT INTO dbo.UserActivityLogs (userId, action, targetType, targetId)
        VALUES (@moderatorUserId, N'accept_answer', N'answer', @answerId);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

/* =========================================================
   PHAN H - STORED PROCEDURE NHOM BAO CAO VI PHAM
   ========================================================= */

/*
    Nghiep vu: Tao bao cao.
    Muc tieu:
    - User report document/comment/question/answer.
    - Bang Reports dam bao chi 1 target duoc set.
*/
CREATE OR ALTER PROCEDURE dbo.usp_CreateReport
    @reporterUserId INT,
    @documentId INT = NULL,
    @commentId INT = NULL,
    @questionId INT = NULL,
    @answerId INT = NULL,
    @reason NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.Reports (
        reporterUserId,
        documentId,
        commentId,
        questionId,
        answerId,
        reason
    )
    VALUES (
        @reporterUserId,
        @documentId,
        @commentId,
        @questionId,
        @answerId,
        @reason
    );

    DECLARE @reportId INT = CAST(SCOPE_IDENTITY() AS INT);

    INSERT INTO dbo.UserActivityLogs (userId, action, targetType, targetId)
    VALUES (@reporterUserId, N'create_report', N'report', @reportId);

    SELECT @reportId AS reportId;
END;
GO

/*
    Nghiep vu: Xu ly bao cao.
    Muc tieu:
    - Cap nhat trang thai report.
    - Luu nguoi xu ly, ghi chu va thoi diem xu ly.
    - Co the an noi dung vi pham neu can.
*/
CREATE OR ALTER PROCEDURE dbo.usp_ResolveReport
    @reportId INT,
    @reviewedByUserId INT,
    @status NVARCHAR(20),
    @reviewNote NVARCHAR(255) = NULL,
    @hideTarget BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    IF @status NOT IN (N'reviewed', N'resolved', N'dismissed')
    BEGIN
        THROW 55401, N'Trang thai xu ly report khong hop le.', 1;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.Reports
        SET
            status = @status,
            reviewedByUserId = @reviewedByUserId,
            reviewNote = @reviewNote,
            reviewedAt = SYSDATETIME()
        WHERE reportId = @reportId;

        IF @@ROWCOUNT = 0
        BEGIN
            THROW 55402, N'Report khong ton tai.', 1;
        END;

        IF @hideTarget = 1 AND @status = N'resolved'
        BEGIN
            UPDATE d
            SET status = N'hidden'
            FROM dbo.Documents d
            INNER JOIN dbo.Reports r ON r.documentId = d.documentId
            WHERE r.reportId = @reportId;

            UPDATE c
            SET status = N'hidden'
            FROM dbo.Comments c
            INNER JOIN dbo.Reports r ON r.commentId = c.commentId
            WHERE r.reportId = @reportId;

            UPDATE q
            SET status = N'hidden'
            FROM dbo.Questions q
            INNER JOIN dbo.Reports r ON r.questionId = q.questionId
            WHERE r.reportId = @reportId;

            UPDATE a
            SET status = N'hidden'
            FROM dbo.Answers a
            INNER JOIN dbo.Reports r ON r.answerId = a.answerId
            WHERE r.reportId = @reportId;
        END;

        INSERT INTO dbo.UserActivityLogs (userId, action, targetType, targetId)
        VALUES (@reviewedByUserId, N'resolve_report', N'report', @reportId);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

/* =========================================================
   PHAN I - KIEM TRA NHANH DOI TUONG DA TAO
   ========================================================= */

SELECT N'VIEW' AS objectType, name AS objectName
FROM sys.views
WHERE name IN (
    N'vwApprovedDocumentSummary',
    N'vwDocumentReviewHistory',
    N'vwPendingReports',
    N'vwUserContributionSummary'
)
UNION ALL
SELECT N'PROCEDURE', name
FROM sys.procedures
WHERE name IN (
    N'usp_RegisterUser',
    N'usp_SetUserActiveStatus',
    N'usp_VerifyUser',
    N'usp_GetUserProfile',
    N'usp_UpdateUserProfile',
    N'usp_CreateDocument',
    N'usp_GetDocumentDetail',
    N'usp_SearchApprovedDocuments',
    N'usp_UpdateDocument',
    N'usp_HideDocument',
    N'usp_ReviewDocument',
    N'usp_CreateComment',
    N'usp_CreateQuestion',
    N'usp_CreateAnswer',
    N'usp_AcceptAnswer',
    N'usp_CreateReport',
    N'usp_ResolveReport'
)
UNION ALL
SELECT N'TRIGGER', name
FROM sys.triggers
WHERE name IN (
    N'trg_DocumentReviews_SyncDocumentStatus',
    N'trg_Users_SetUpdatedAt',
    N'trg_Documents_SetUpdatedAt',
    N'trg_Comments_SetUpdatedAt',
    N'trg_Questions_SetUpdatedAt',
    N'trg_Answers_SetUpdatedAt'
)
ORDER BY objectType, objectName;
GO
