/*
    DatabaseBusinessRules_Patch02.sql

    Muc tieu:
    - Dieu chinh nghiep vu hoi dap theo huong "trao doi truc tiep voi tac gia".
    - Loai bo co che "moi cau hoi chi co 1 cau tra loi duoc chap nhan".
    - Bo sung nghiep vu ho tro moderator kiem tra tai lieu co dau hieu trung lap.

    Ghi chu quan trong:
    - Realtime chat la nghiep vu phu hop voi BackEnd + WebSocket/Socket.IO.
    - Database trong patch nay chi dong vai tro luu thread hoi dap va lich su tin nhan.
    - Kiem tra trung lap muc "so khop sau" (hash file, OCR, trich xuat noi dung, so khop tuong dong)
      nen xu ly o BackEnd. Database patch nay chi ho tro tim ung vien trung lap o muc metadata.

    Thu tu chay:
    1. SQLQuery1.sql
    2. DatabaseBusinessRules.sql
    3. DatabaseBusinessRules_Patch01.sql
    4. DatabaseBusinessRules_Patch02.sql
*/

SET NOCOUNT ON;
GO

/* =========================================================
   PATCH 02 - LOAI BO RANG BUOC ACCEPTED ANSWER
   ========================================================= */

/*
    Nghiep vu moi:
    - Khong con co che "accepted answer".
    - Answers duoc xem nhu cac tin nhan trao doi trong thread hoi dap.
*/
IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_Answers_OneAcceptedPerQuestion'
      AND object_id = OBJECT_ID(N'dbo.Answers')
)
BEGIN
    DROP INDEX UX_Answers_OneAcceptedPerQuestion ON dbo.Answers;
END;
GO

/* =========================================================
   PATCH 02 - DIEU CHINH TAO CAU HOI VOI TAC GIA
   ========================================================= */

/*
    Nghiep vu moi:
    - Moi tai lieu approved co the mo thread "hoi tac gia".
    - Nguoi hoi phai la user dang hoat dong va khong duoc la chinh tac gia.
    - Thread nay la diem bat dau cho viec chat qua lai giua nguoi hoi va tac gia.
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

    IF EXISTS (
        SELECT 1
        FROM dbo.Documents
        WHERE documentId = @documentId
          AND ownerUserId = @askerUserId
    )
    BEGIN
        THROW 55310, N'Tac gia khong can tao cau hoi voi chinh tai lieu cua minh.', 1;
    END;

    INSERT INTO dbo.Questions (documentId, askerUserId, content)
    VALUES (@documentId, @askerUserId, @content);

    DECLARE @questionId INT = CAST(SCOPE_IDENTITY() AS INT);

    INSERT INTO dbo.UserActivityLogs (userId, action, targetType, targetId)
    VALUES (@askerUserId, N'create_question_thread', N'question', @questionId);

    SELECT @questionId AS questionId;
END;
GO

/* =========================================================
   PATCH 02 - DIEU CHINH TAO TIN NHAN TRAO DOI TRONG THREAD
   ========================================================= */

/*
    Nghiep vu moi:
    - Answers khong con la "dap an chap nhan", ma la cac tin nhan trong thread hoi dap.
    - Chi co 2 ben duoc gui tin trong thread:
      + nguoi dat cau hoi
      + tac gia cua tai lieu
    - Thread chi gui tin khi dang open.
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
        FROM dbo.Users
        WHERE userId = @responderUserId
          AND isActive = 1
    )
    BEGIN
        THROW 55308, N'Nguoi gui tin nhan khong hop le hoac da bi khoa.', 1;
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Questions
        WHERE questionId = @questionId
          AND status = N'open'
    )
    BEGIN
        THROW 55303, N'Thread cau hoi khong ton tai, da dong hoac da bi an.', 1;
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Questions q
        INNER JOIN dbo.Documents d ON d.documentId = q.documentId
        WHERE q.questionId = @questionId
          AND @responderUserId IN (q.askerUserId, d.ownerUserId)
    )
    BEGIN
        THROW 55311, N'Chi nguoi hoi va tac gia moi duoc trao doi trong thread nay.', 1;
    END;

    INSERT INTO dbo.Answers (questionId, responderUserId, content, isAccepted)
    VALUES (@questionId, @responderUserId, @content, 0);

    DECLARE @answerId INT = CAST(SCOPE_IDENTITY() AS INT);

    INSERT INTO dbo.UserActivityLogs (userId, action, targetType, targetId)
    VALUES (@responderUserId, N'send_question_message', N'answer', @answerId);

    SELECT @answerId AS answerId;
END;
GO

/* =========================================================
   PATCH 02 - NGHIEP VU ACCEPT ANSWER KHONG CON SU DUNG
   ========================================================= */

/*
    Nghiep vu moi:
    - He thong khong con "chap nhan 1 cau tra loi".
    - Thread hoi dap se duoc dong bang nghiep vu close thread, khong dung accepted answer.
*/
CREATE OR ALTER PROCEDURE dbo.usp_AcceptAnswer
    @questionId INT,
    @answerId INT,
    @moderatorUserId INT
AS
BEGIN
    SET NOCOUNT ON;

    THROW 55312, N'Nghiep vu accept answer khong con duoc su dung. Hay dong thread hoi dap neu can.', 1;
END;
GO

/* =========================================================
   PATCH 02 - BO SUNG NGHIEP VU XEM THREAD HOI DAP
   ========================================================= */

/*
    Muc dich:
    - Lay thong tin thread hoi dap giua nguoi hoi va tac gia.
    - Phu hop cho backend doc lich su de day ra giao dien chat/realtime.

    Ket qua:
    - Result set 1: thong tin thread
    - Result set 2: danh sach message theo thu tu thoi gian
*/
CREATE OR ALTER PROCEDURE dbo.usp_GetQuestionConversation
    @questionId INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Questions
        WHERE questionId = @questionId
    )
    BEGIN
        THROW 55313, N'Thread cau hoi khong ton tai.', 1;
    END;

    SELECT
        q.questionId,
        q.documentId,
        d.title AS documentTitle,
        d.ownerUserId AS authorUserId,
        authorUser.name AS authorName,
        q.askerUserId,
        askerUser.name AS askerName,
        q.status,
        q.createdAt,
        q.updatedAt
    FROM dbo.Questions q
    INNER JOIN dbo.Documents d ON d.documentId = q.documentId
    INNER JOIN dbo.Users authorUser ON authorUser.userId = d.ownerUserId
    INNER JOIN dbo.Users askerUser ON askerUser.userId = q.askerUserId
    WHERE q.questionId = @questionId;

    SELECT
        conversation.messageType,
        conversation.messageId,
        conversation.senderUserId,
        conversation.senderName,
        conversation.senderRoleInThread,
        conversation.content,
        conversation.createdAt,
        conversation.updatedAt
    FROM (
        SELECT
            N'question' AS messageType,
            q.questionId AS messageId,
            q.askerUserId AS senderUserId,
            askerUser.name AS senderName,
            N'asker' AS senderRoleInThread,
            q.content,
            q.createdAt,
            q.updatedAt
        FROM dbo.Questions q
        INNER JOIN dbo.Users askerUser ON askerUser.userId = q.askerUserId
        WHERE q.questionId = @questionId

        UNION ALL

        SELECT
            N'answer' AS messageType,
            a.answerId AS messageId,
            a.responderUserId AS senderUserId,
            senderUser.name AS senderName,
            CASE
                WHEN a.responderUserId = q.askerUserId THEN N'asker'
                ELSE N'author'
            END AS senderRoleInThread,
            a.content,
            a.createdAt,
            a.updatedAt
        FROM dbo.Answers a
        INNER JOIN dbo.Questions q ON q.questionId = a.questionId
        INNER JOIN dbo.Users senderUser ON senderUser.userId = a.responderUserId
        WHERE a.questionId = @questionId
          AND a.status = N'active'
    ) conversation
    ORDER BY conversation.createdAt, conversation.messageType, conversation.messageId;
END;
GO

/* =========================================================
   PATCH 02 - BO SUNG NGHIEP VU DONG THREAD HOI DAP
   ========================================================= */

/*
    Muc dich:
    - Dong thread trao doi khi van de da duoc trao doi xong.
    - Nguoi hoi, tac gia, moderator, admin deu co the dong thread.
*/
CREATE OR ALTER PROCEDURE dbo.usp_CloseQuestionConversation
    @questionId INT,
    @actorUserId INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Users
        WHERE userId = @actorUserId
          AND isActive = 1
    )
    BEGIN
        THROW 55314, N'Nguoi dong thread khong hop le hoac da bi khoa.', 1;
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Questions q
        INNER JOIN dbo.Documents d ON d.documentId = q.documentId
        INNER JOIN dbo.Users u ON u.userId = @actorUserId
        WHERE q.questionId = @questionId
          AND (
                @actorUserId = q.askerUserId
                OR @actorUserId = d.ownerUserId
                OR u.role IN (N'moderator', N'admin')
              )
    )
    BEGIN
        THROW 55315, N'Ban khong co quyen dong thread hoi dap nay.', 1;
    END;

    UPDATE dbo.Questions
    SET status = N'resolved'
    WHERE questionId = @questionId
      AND status = N'open';

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 55316, N'Thread khong ton tai, da dong hoac da bi an.', 1;
    END;

    INSERT INTO dbo.UserActivityLogs (userId, action, targetType, targetId)
    VALUES (@actorUserId, N'close_question_conversation', N'question', @questionId);
END;
GO

/* =========================================================
   PATCH 02 - BO SUNG VIEW DANH SACH THREAD HOI DAP
   ========================================================= */

/*
    Muc dich:
    - Phuc vu backend/frontend hien danh sach thread tren moi tai lieu.
    - Cho phep xem nhanh nguoi hoi, tac gia, trang thai va tong so tin nhan.
*/
CREATE OR ALTER VIEW dbo.vwQuestionConversationSummary
AS
SELECT
    q.questionId,
    q.documentId,
    d.title AS documentTitle,
    d.ownerUserId AS authorUserId,
    authorUser.name AS authorName,
    q.askerUserId,
    askerUser.name AS askerName,
    q.status,
    q.createdAt,
    q.updatedAt,
    COUNT(a.answerId) AS totalMessagesAfterQuestion
FROM dbo.Questions q
INNER JOIN dbo.Documents d ON d.documentId = q.documentId
INNER JOIN dbo.Users authorUser ON authorUser.userId = d.ownerUserId
INNER JOIN dbo.Users askerUser ON askerUser.userId = q.askerUserId
LEFT JOIN dbo.Answers a
    ON a.questionId = q.questionId
   AND a.status = N'active'
GROUP BY
    q.questionId,
    q.documentId,
    d.title,
    d.ownerUserId,
    authorUser.name,
    q.askerUserId,
    askerUser.name,
    q.status,
    q.createdAt,
    q.updatedAt;
GO

/* =========================================================
   PATCH 02 - HO TRO KIEM TRA TRUNG LAP TAI LIEU
   ========================================================= */

/*
    Giai thich kien truc:
    - Database co the ho tro tim ung vien trung lap dua tren metadata.
    - Viec ket luan "trung lap that su" nen do BackEnd xu ly bang:
      + hash file
      + OCR/trich xuat text
      + so khop noi dung tuong dong
      + quy tac nghiep vu linh hoat

    Procedure nay tra ve cac tai lieu cu hon co dau hieu trung lap theo:
    - cung tieu de sau khi chuan hoa khoang trang
    - hoac cung fileUrl
*/
CREATE OR ALTER PROCEDURE dbo.usp_FindDuplicateDocumentCandidates
    @documentId INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Documents
        WHERE documentId = @documentId
    )
    BEGIN
        THROW 55205, N'Tai lieu can kiem tra trung lap khong ton tai.', 1;
    END;

    ;WITH currentDocument AS (
        SELECT
            d.documentId,
            LOWER(LTRIM(RTRIM(d.title))) AS normalizedTitle,
            d.fileUrl,
            d.createdAt
        FROM dbo.Documents d
        WHERE d.documentId = @documentId
    )
    SELECT
        oldDoc.documentId,
        oldDoc.title,
        oldDoc.fileUrl,
        oldDoc.status,
        oldDoc.createdAt,
        oldDoc.ownerUserId,
        ownerUser.name AS ownerName,
        CASE
            WHEN LOWER(LTRIM(RTRIM(oldDoc.title))) = cur.normalizedTitle
                 AND oldDoc.fileUrl = cur.fileUrl
                THEN N'trung_title_va_fileUrl'
            WHEN LOWER(LTRIM(RTRIM(oldDoc.title))) = cur.normalizedTitle
                THEN N'trung_title'
            WHEN oldDoc.fileUrl = cur.fileUrl
                THEN N'trung_fileUrl'
            ELSE N'khac'
        END AS duplicateReason
    FROM currentDocument cur
    INNER JOIN dbo.Documents oldDoc
        ON oldDoc.documentId <> @documentId
       AND oldDoc.documentId < @documentId
       AND oldDoc.status IN (N'pending', N'approved', N'rejected')
       AND (
            LOWER(LTRIM(RTRIM(oldDoc.title))) = cur.normalizedTitle
            OR oldDoc.fileUrl = cur.fileUrl
       )
    INNER JOIN dbo.Users ownerUser ON ownerUser.userId = oldDoc.ownerUserId
    ORDER BY oldDoc.createdAt DESC, oldDoc.documentId DESC;
END;
GO

/* =========================================================
   KIEM TRA NHANH DOI TUONG PATCH 02
   ========================================================= */

SELECT N'PATCH02_VIEW' AS objectType, v.name AS objectName
FROM sys.views v
WHERE v.name IN (
    N'vwQuestionConversationSummary'
)
UNION ALL
SELECT N'PATCH02_PROCEDURE', p.name
FROM sys.procedures p
WHERE p.name IN (
    N'usp_CreateQuestion',
    N'usp_CreateAnswer',
    N'usp_AcceptAnswer',
    N'usp_GetQuestionConversation',
    N'usp_CloseQuestionConversation',
    N'usp_FindDuplicateDocumentCandidates'
)
ORDER BY objectType, objectName;
GO
