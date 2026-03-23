/*
    DatabaseBusinessRules_Patch01.sql

    Muc tieu:
    - Bo sung va siet lai mot so nghiep vu phase 1 ma khong chinh sua file cu.
    - Phu hop de chay SAU KHI da chay SQLQuery1.sql va DatabaseBusinessRules.sql.

    Noi dung patch:
    - Bo sung kiem tra user dang hoat dong cho cac nghiep vu tao noi dung / bao cao.
    - Bo sung kiem tra quyen moderator/admin khi xu ly report.
    - Chi cho phep review tai lieu dang pending.
    - Chi cho phep tra loi cau hoi dang open.
    - Bo sung log khi an tai lieu, theo huong tuong thich nguoc.

    Cach chay:
    1. Chay SQLQuery1.sql
    2. Chay DatabaseBusinessRules.sql
    3. Chay file patch nay
*/

SET NOCOUNT ON;
GO

/* =========================================================
   PATCH 01 - AN TAI LIEU CO GHI LOG
   ========================================================= */

/*
    Bo sung:
    - Them tham so tuy chon @actorUserId de backend moi co the ghi log nguoi an tai lieu.
    - Van tuong thich voi cach goi cu: chi truyen @documentId.
*/
CREATE OR ALTER PROCEDURE dbo.usp_HideDocument
    @documentId INT,
    @actorUserId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @actorUserId IS NOT NULL
       AND NOT EXISTS (
            SELECT 1
            FROM dbo.Users
            WHERE userId = @actorUserId
              AND isActive = 1
       )
    BEGIN
        THROW 55107, N'Nguoi thuc hien an tai lieu khong hop le.', 1;
    END;

    UPDATE dbo.Documents
    SET status = N'hidden'
    WHERE documentId = @documentId;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 55103, N'Tai lieu khong ton tai.', 1;
    END;

    IF @actorUserId IS NOT NULL
    BEGIN
        INSERT INTO dbo.UserActivityLogs (userId, action, targetType, targetId)
        VALUES (@actorUserId, N'hide_document', N'document', @documentId);
    END;
END;
GO

/* =========================================================
   PATCH 01 - SIET NGHIEP VU KIEM DUYET
   ========================================================= */

/*
    Bo sung:
    - Chi cho phep duyet tai lieu dang pending.
    - Giup backend co thong diep nghiep vu ro hon khi moderator review sai trang thai.
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

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Documents
        WHERE documentId = @documentId
          AND status = N'pending'
    )
    BEGIN
        THROW 55204, N'Chi duoc duyet tai lieu dang pending.', 1;
    END;

    INSERT INTO dbo.DocumentReviews (documentId, moderatorUserId, decision, note)
    VALUES (@documentId, @moderatorUserId, @decision, @note);

    INSERT INTO dbo.UserActivityLogs (userId, action, targetType, targetId)
    VALUES (@moderatorUserId, N'review_document', N'document', @documentId);
END;
GO

/* =========================================================
   PATCH 01 - SIET NGHIEP VU TAO BINH LUAN / CAU HOI / CAU TRA LOI
   ========================================================= */

CREATE OR ALTER PROCEDURE dbo.usp_CreateComment
    @documentId INT,
    @authorUserId INT,
    @content NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Users
        WHERE userId = @authorUserId
          AND isActive = 1
    )
    BEGIN
        THROW 55306, N'Nguoi binh luan khong hop le hoac da bi khoa.', 1;
    END;

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

CREATE OR ALTER PROCEDURE dbo.usp_CreateQuestion
    @documentId INT,
    @askerUserId INT,
    @content NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Users
        WHERE userId = @askerUserId
          AND isActive = 1
    )
    BEGIN
        THROW 55307, N'Nguoi dat cau hoi khong hop le hoac da bi khoa.', 1;
    END;

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

CREATE OR ALTER PROCEDURE dbo.usp_CreateAnswer
    @questionId INT,
    @responderUserId INT,
    @content NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Users
        WHERE userId = @responderUserId
          AND isActive = 1
    )
    BEGIN
        THROW 55308, N'Nguoi tra loi khong hop le hoac da bi khoa.', 1;
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Questions
        WHERE questionId = @questionId
          AND status = N'open'
    )
    BEGIN
        THROW 55303, N'Chi duoc tra loi cau hoi dang open.', 1;
    END;

    INSERT INTO dbo.Answers (questionId, responderUserId, content)
    VALUES (@questionId, @responderUserId, @content);

    DECLARE @answerId INT = CAST(SCOPE_IDENTITY() AS INT);

    INSERT INTO dbo.UserActivityLogs (userId, action, targetType, targetId)
    VALUES (@responderUserId, N'create_answer', N'answer', @answerId);

    SELECT @answerId AS answerId;
END;
GO

/* =========================================================
   PATCH 01 - SIET NGHIEP VU BAO CAO VA XU LY BAO CAO
   ========================================================= */

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

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Users
        WHERE userId = @reporterUserId
          AND isActive = 1
    )
    BEGIN
        THROW 55403, N'Nguoi bao cao khong hop le hoac da bi khoa.', 1;
    END;

    IF (
        (CASE WHEN @documentId IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN @commentId IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN @questionId IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN @answerId IS NULL THEN 0 ELSE 1 END)
    ) <> 1
    BEGIN
        THROW 55404, N'Bao cao phai chi ro dung 1 doi tuong muc tieu.', 1;
    END;

    IF @documentId IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM dbo.Documents WHERE documentId = @documentId)
    BEGIN
        THROW 55405, N'Tai lieu bi bao cao khong ton tai.', 1;
    END;

    IF @commentId IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM dbo.Comments WHERE commentId = @commentId)
    BEGIN
        THROW 55406, N'Binh luan bi bao cao khong ton tai.', 1;
    END;

    IF @questionId IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM dbo.Questions WHERE questionId = @questionId)
    BEGIN
        THROW 55407, N'Cau hoi bi bao cao khong ton tai.', 1;
    END;

    IF @answerId IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE answerId = @answerId)
    BEGIN
        THROW 55408, N'Cau tra loi bi bao cao khong ton tai.', 1;
    END;

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

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Users
        WHERE userId = @reviewedByUserId
          AND role IN (N'moderator', N'admin')
          AND isActive = 1
    )
    BEGIN
        THROW 55409, N'Nguoi xu ly report khong hop le.', 1;
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
   KIEM TRA NHANH PATCH DA AP DUNG
   ========================================================= */

SELECT
    N'PATCHED_PROCEDURE' AS objectType,
    p.name AS objectName
FROM sys.procedures p
WHERE p.name IN (
    N'usp_HideDocument',
    N'usp_ReviewDocument',
    N'usp_CreateComment',
    N'usp_CreateQuestion',
    N'usp_CreateAnswer',
    N'usp_CreateReport',
    N'usp_ResolveReport'
)
ORDER BY p.name;
GO
