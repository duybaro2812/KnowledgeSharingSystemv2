/*
    DatabaseTestCases.sql

    Muc dich:
    - Test toan bo business logic SQL hien tai
    - Bao gom: tai khoan, tai lieu, kiem duyet, hoi dap, bao cao
    - Sau khi test xong se ROLLBACK de database quay ve trang thai rong du lieu

    Luu y:
    - File nay khong hard-code categoryId = 1,2,3
    - File nay uu tien doc lai ID that tu database sau khi insert
*/

SET NOCOUNT ON;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    PRINT N'=== BAT DAU DATABASE TEST CASES ===';

    /* =========================================================
       1. TAO DU LIEU NEN
       ========================================================= */

    DECLARE
        @categoryProgrammingId INT,
        @categoryDatabaseId INT,
        @categorySoftSkillId INT;

    PRINT N'1. Tao Categories';
    INSERT INTO dbo.Categories (name, description)
    VALUES
        (N'Lap trinh', N'Tai lieu lap trinh'),
        (N'Co so du lieu', N'Tai lieu database'),
        (N'Ky nang mem', N'Tai lieu ky nang');

    SELECT
        @categoryProgrammingId = MIN(CASE WHEN name = N'Lap trinh' THEN categoryId END),
        @categoryDatabaseId = MIN(CASE WHEN name = N'Co so du lieu' THEN categoryId END),
        @categorySoftSkillId = MIN(CASE WHEN name = N'Ky nang mem' THEN categoryId END)
    FROM dbo.Categories
    WHERE name IN (N'Lap trinh', N'Co so du lieu', N'Ky nang mem');

    SELECT * FROM dbo.Categories ORDER BY categoryId;

    /* =========================================================
       2. TEST NGHIEP VU TAI KHOAN
       ========================================================= */

    DECLARE
        @aliceId INT,
        @bobId INT,
        @moderatorId INT,
        @adminId INT;

    PRINT N'2. Dang ky users';
    EXEC dbo.usp_RegisterUser
        @name = N'Alice',
        @email = N'alice@test.local',
        @passwordHash = N'hash_alice',
        @role = N'user';

    EXEC dbo.usp_RegisterUser
        @name = N'Bob',
        @email = N'bob@test.local',
        @passwordHash = N'hash_bob',
        @role = N'user';

    EXEC dbo.usp_RegisterUser
        @name = N'Moderator One',
        @email = N'moderator@test.local',
        @passwordHash = N'hash_moderator',
        @role = N'moderator';

    EXEC dbo.usp_RegisterUser
        @name = N'Admin One',
        @email = N'admin@test.local',
        @passwordHash = N'hash_admin',
        @role = N'admin';

    SELECT @aliceId = userId FROM dbo.Users WHERE email = N'alice@test.local';
    SELECT @bobId = userId FROM dbo.Users WHERE email = N'bob@test.local';
    SELECT @moderatorId = userId FROM dbo.Users WHERE email = N'moderator@test.local';
    SELECT @adminId = userId FROM dbo.Users WHERE email = N'admin@test.local';

    SELECT * FROM dbo.Users ORDER BY userId;

    PRINT N'3. Verify users';
    EXEC dbo.usp_VerifyUser @userId = @aliceId;
    EXEC dbo.usp_VerifyUser @userId = @bobId;
    EXEC dbo.usp_VerifyUser @userId = @moderatorId;
    EXEC dbo.usp_VerifyUser @userId = @adminId;

    SELECT userId, name, isVerified FROM dbo.Users ORDER BY userId;

    PRINT N'4. Khoa va mo lai Bob';
    EXEC dbo.usp_SetUserActiveStatus @userId = @bobId, @isActive = 0;
    SELECT userId, name, isActive FROM dbo.Users WHERE userId = @bobId;

    EXEC dbo.usp_SetUserActiveStatus @userId = @bobId, @isActive = 1;
    SELECT userId, name, isActive FROM dbo.Users WHERE userId = @bobId;

    PRINT N'5. Xem va cap nhat ho so Alice';
    EXEC dbo.usp_GetUserProfile @userId = @aliceId;
    EXEC dbo.usp_UpdateUserProfile @userId = @aliceId, @name = N'Alice Updated';
    EXEC dbo.usp_GetUserProfile @userId = @aliceId;

    /* =========================================================
       3. TEST NGHIEP VU TAI LIEU
       ========================================================= */

    DECLARE @documentId INT;
    DECLARE @documentTitle NVARCHAR(255) = N'Tri thuc an trong chia se tai lieu';
    DECLARE @createCategoryIds NVARCHAR(500);
    DECLARE @updateCategoryIds NVARCHAR(500);

    SET @createCategoryIds = CONCAT(@categoryProgrammingId, N',', @categoryDatabaseId);
    SET @updateCategoryIds = CONCAT(@categoryProgrammingId, N',', @categoryDatabaseId, N',', @categorySoftSkillId);

    PRINT N'6. Tao document';
    EXEC dbo.usp_CreateDocument
        @ownerUserId = @aliceId,
        @title = @documentTitle,
        @description = N'Tai lieu mau de test business logic',
        @fileUrl = N'/files/document-001.pdf',
        @categoryIds = @createCategoryIds;

    SELECT TOP 1 @documentId = documentId
    FROM dbo.Documents
    WHERE ownerUserId = @aliceId
      AND title = @documentTitle
    ORDER BY createdAt DESC;

    SELECT * FROM dbo.Documents WHERE documentId = @documentId;
    SELECT * FROM dbo.DocumentCategories WHERE documentId = @documentId ORDER BY categoryId;

    PRINT N'7. Xem chi tiet document';
    EXEC dbo.usp_GetDocumentDetail @documentId = @documentId;

    PRINT N'8. Cap nhat document';
    EXEC dbo.usp_UpdateDocument
        @documentId = @documentId,
        @title = N'Tri thuc an trong chia se tai lieu - cap nhat',
        @description = N'Ban cap nhat metadata tai lieu',
        @fileUrl = N'/files/document-001-v2.pdf',
        @categoryIds = @updateCategoryIds;

    SELECT * FROM dbo.Documents WHERE documentId = @documentId;
    SELECT * FROM dbo.DocumentCategories WHERE documentId = @documentId ORDER BY categoryId;

    PRINT N'9. Duyet document';
    EXEC dbo.usp_ReviewDocument
        @documentId = @documentId,
        @moderatorUserId = @moderatorId,
        @decision = N'approved',
        @note = N'Tai lieu dat yeu cau';

    SELECT * FROM dbo.Documents WHERE documentId = @documentId;
    SELECT * FROM dbo.DocumentReviews WHERE documentId = @documentId;
    SELECT * FROM dbo.vwDocumentReviewHistory WHERE documentId = @documentId;

    PRINT N'10. Tim kiem tai lieu da duyet';
    EXEC dbo.usp_SearchApprovedDocuments @keyword = N'cap nhat', @categoryId = @categoryProgrammingId;

    /* =========================================================
       4. TEST TUONG TAC TRI THUC
       ========================================================= */

    DECLARE @commentId INT;
    DECLARE @questionId INT;
    DECLARE @answerId INT;

    PRINT N'11. Tao comment';
    EXEC dbo.usp_CreateComment
        @documentId = @documentId,
        @authorUserId = @bobId,
        @content = N'Tai lieu huu ich, can them vi du thuc te.';

    SELECT TOP 1 @commentId = commentId
    FROM dbo.Comments
    WHERE documentId = @documentId
      AND authorUserId = @bobId
    ORDER BY createdAt DESC;

    SELECT * FROM dbo.Comments WHERE commentId = @commentId;

    PRINT N'12. Tao question';
    EXEC dbo.usp_CreateQuestion
        @documentId = @documentId,
        @askerUserId = @bobId,
        @content = N'Lam sao de danh gia duoc tri thuc an trong tai lieu?';

    SELECT TOP 1 @questionId = questionId
    FROM dbo.Questions
    WHERE documentId = @documentId
      AND askerUserId = @bobId
    ORDER BY createdAt DESC;

    SELECT * FROM dbo.Questions WHERE questionId = @questionId;

    PRINT N'13. Tao answer';
    EXEC dbo.usp_CreateAnswer
        @questionId = @questionId,
        @responderUserId = @aliceId,
        @content = N'Co the ket hop danh gia moderator va phan hoi tu cong dong.';

    SELECT TOP 1 @answerId = answerId
    FROM dbo.Answers
    WHERE questionId = @questionId
      AND responderUserId = @aliceId
    ORDER BY createdAt DESC;

    SELECT * FROM dbo.Answers WHERE answerId = @answerId;

    PRINT N'14. Chap nhan answer';
    EXEC dbo.usp_AcceptAnswer
        @questionId = @questionId,
        @answerId = @answerId,
        @moderatorUserId = @moderatorId;

    SELECT * FROM dbo.Answers WHERE questionId = @questionId;
    SELECT * FROM dbo.Questions WHERE questionId = @questionId;

    /* =========================================================
       5. TEST REPORT
       ========================================================= */

    DECLARE @reportId INT;

    PRINT N'15. Tao report cho comment';
    EXEC dbo.usp_CreateReport
        @reporterUserId = @aliceId,
        @commentId = @commentId,
        @reason = N'Can moderator kiem tra lai noi dung comment';

    SELECT TOP 1 @reportId = reportId
    FROM dbo.Reports
    WHERE reporterUserId = @aliceId
      AND commentId = @commentId
    ORDER BY createdAt DESC;

    SELECT * FROM dbo.Reports WHERE reportId = @reportId;
    SELECT * FROM dbo.vwPendingReports;

    PRINT N'16. Resolve report va an comment';
    EXEC dbo.usp_ResolveReport
        @reportId = @reportId,
        @reviewedByUserId = @adminId,
        @status = N'resolved',
        @reviewNote = N'Comment tam thoi bi an',
        @hideTarget = 1;

    SELECT * FROM dbo.Reports WHERE reportId = @reportId;
    SELECT * FROM dbo.Comments WHERE commentId = @commentId;

    /* =========================================================
       6. TEST AN TAI LIEU
       ========================================================= */

    PRINT N'17. An tai lieu';
    EXEC dbo.usp_HideDocument @documentId = @documentId;
    SELECT * FROM dbo.Documents WHERE documentId = @documentId;

    /* =========================================================
       7. TEST VIEW VA LOG
       ========================================================= */

    PRINT N'18. Kiem tra cac view tong hop';
    SELECT * FROM dbo.vwApprovedDocumentSummary;
    SELECT * FROM dbo.vwUserContributionSummary ORDER BY userId;

    PRINT N'19. Kiem tra user activity logs';
    SELECT * FROM dbo.UserActivityLogs ORDER BY logId;

    PRINT N'=== HOAN TAT TEST - CHUAN BI ROLLBACK ===';
    ROLLBACK TRANSACTION;
    PRINT N'=== DA ROLLBACK XONG ===';

    PRINT N'20. Kiem tra lai so dong sau rollback';
    SELECT N'Users' AS tableName, COUNT(*) AS totalRows FROM dbo.Users
    UNION ALL
    SELECT N'Categories', COUNT(*) FROM dbo.Categories
    UNION ALL
    SELECT N'Documents', COUNT(*) FROM dbo.Documents
    UNION ALL
    SELECT N'DocumentCategories', COUNT(*) FROM dbo.DocumentCategories
    UNION ALL
    SELECT N'Comments', COUNT(*) FROM dbo.Comments
    UNION ALL
    SELECT N'Questions', COUNT(*) FROM dbo.Questions
    UNION ALL
    SELECT N'Answers', COUNT(*) FROM dbo.Answers
    UNION ALL
    SELECT N'DocumentReviews', COUNT(*) FROM dbo.DocumentReviews
    UNION ALL
    SELECT N'Reports', COUNT(*) FROM dbo.Reports
    UNION ALL
    SELECT N'UserActivityLogs', COUNT(*) FROM dbo.UserActivityLogs;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    PRINT N'=== TEST THAT BAI, DA ROLLBACK ===';

    SELECT
        ERROR_NUMBER() AS ErrorNumber,
        ERROR_MESSAGE() AS ErrorMessage,
        ERROR_LINE() AS ErrorLine,
        ERROR_PROCEDURE() AS ErrorProcedure;
END CATCH;
GO
