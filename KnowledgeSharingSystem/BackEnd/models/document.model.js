const { getPool, sql } = require('../utils/db');

const normalizeCategoryIds = (categoryIds) => {
    if (Array.isArray(categoryIds)) {
        return categoryIds.join(',');
    }

    if (typeof categoryIds === 'string') {
        const trimmedValue = categoryIds.trim();

        if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
            try {
                const parsedValue = JSON.parse(trimmedValue);

                if (Array.isArray(parsedValue)) {
                    return parsedValue.join(',');
                }
            } catch (error) {
                return categoryIds;
            }
        }

        return categoryIds;
    }

    return null;
};

const searchApprovedDocuments = async ({ keyword, categoryId, categoryKeyword }) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('keyword', sql.NVarChar(255), keyword || null)
        .input('categoryId', sql.Int, categoryId || null)
        .input('categoryKeyword', sql.NVarChar(100), categoryKeyword || null)
        .query(`
            SELECT DISTINCT
                d.documentId,
                d.title,
                d.description,
                d.fileUrl,
                d.originalFileName,
                d.fileSizeBytes,
                d.mimeType,
                d.createdAt,
                d.updatedAt,
                u.userId AS ownerUserId,
                u.name AS ownerName
            FROM dbo.Documents d
            INNER JOIN dbo.Users u ON u.userId = d.ownerUserId
            LEFT JOIN dbo.DocumentCategories dc ON dc.documentId = d.documentId
            LEFT JOIN dbo.Categories c ON c.categoryId = dc.categoryId
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
              AND (
                    @categoryKeyword IS NULL
                    OR c.name LIKE N'%' + @categoryKeyword + N'%'
              )
            ORDER BY d.createdAt DESC;
        `);

    return result.recordset;
};

const getDocumentDetailById = async (documentId) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .execute('dbo.usp_GetDocumentDetail');

    return result.recordset[0] || null;
};

const createDocument = async ({
    ownerUserId,
    title,
    description,
    fileUrl,
    originalFileName,
    fileSizeBytes,
    mimeType,
    fileHash,
    categoryIds,
}) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('ownerUserId', sql.Int, ownerUserId)
        .input('title', sql.NVarChar(255), title)
        .input('description', sql.NVarChar(sql.MAX), description || null)
        .input('fileUrl', sql.NVarChar(500), fileUrl)
        .input('originalFileName', sql.NVarChar(255), originalFileName)
        .input('fileSizeBytes', sql.BigInt, fileSizeBytes)
        .input('mimeType', sql.NVarChar(100), mimeType)
        .input('fileHash', sql.NVarChar(128), fileHash || null)
        .input('categoryIds', sql.NVarChar(500), normalizeCategoryIds(categoryIds))
        .execute('dbo.usp_CreateDocument');

    return result.recordset[0].documentId;
};

const updateDocument = async ({
    documentId,
    title,
    description,
    fileUrl,
    originalFileName,
    fileSizeBytes,
    mimeType,
    fileHash,
    categoryIds,
}) => {
    const pool = getPool();

    await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .input('title', sql.NVarChar(255), title)
        .input('description', sql.NVarChar(sql.MAX), description || null)
        .input('fileUrl', sql.NVarChar(500), fileUrl)
        .input('originalFileName', sql.NVarChar(255), originalFileName)
        .input('fileSizeBytes', sql.BigInt, fileSizeBytes)
        .input('mimeType', sql.NVarChar(100), mimeType)
        .input('fileHash', sql.NVarChar(128), fileHash || null)
        .input('categoryIds', sql.NVarChar(500), normalizeCategoryIds(categoryIds))
        .execute('dbo.usp_UpdateDocument');
};

const findDuplicateDocumentCandidates = async (documentId) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .execute('dbo.usp_FindDuplicateDocumentCandidates');

    return result.recordset;
};

const getUploadedDocuments = async ({ ownerUserId = null, status = null }) => {
    const pool = getPool();
    const request = pool.request();

    request.input('ownerUserId', sql.Int, ownerUserId);
    request.input('status', sql.NVarChar(30), status || null);

    const result = await request.query(`
        SELECT
            d.documentId,
            d.title,
            d.description,
            d.fileUrl,
            d.originalFileName,
            d.fileSizeBytes,
            d.mimeType,
            d.fileHash,
            d.status,
            d.createdAt,
            d.updatedAt,
            d.ownerUserId,
            u.name AS ownerName,
            u.email AS ownerEmail,
            latestReview.decision AS latestReviewDecision,
            latestReview.note AS latestReviewNote,
            latestReview.createdAt AS latestReviewedAt
        FROM dbo.Documents d
        INNER JOIN dbo.Users u ON u.userId = d.ownerUserId
        OUTER APPLY (
            SELECT TOP 1
                dr.decision,
                dr.note,
                dr.createdAt
            FROM dbo.DocumentReviews dr
            WHERE dr.documentId = d.documentId
            ORDER BY dr.createdAt DESC
        ) latestReview
        WHERE (@ownerUserId IS NULL OR d.ownerUserId = @ownerUserId)
          AND (@status IS NULL OR d.status = @status)
        ORDER BY d.createdAt DESC;
    `);

    return result.recordset;
};

const getPendingDocuments = async () => {
    return getUploadedDocuments({ ownerUserId: null, status: 'pending' });
};

const reviewDocument = async ({ documentId, moderatorUserId, decision, note = null }) => {
    const pool = getPool();

    await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .input('moderatorUserId', sql.Int, moderatorUserId)
        .input('decision', sql.NVarChar(20), decision)
        .input('note', sql.NVarChar(255), note)
        .execute('dbo.usp_ReviewDocument');
};

const updateDocumentStatus = async ({ documentId, status }) => {
    const pool = getPool();

    await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .input('status', sql.NVarChar(20), status)
        .query(`
            UPDATE dbo.Documents
            SET
                status = @status,
                updatedAt = SYSDATETIME()
            WHERE documentId = @documentId;

            IF @@ROWCOUNT = 0
            BEGIN
                THROW 56601, N'Document not found.', 1;
            END;
        `);
};

const logDocumentModerationAction = async ({ userId, action, documentId }) => {
    const pool = getPool();

    await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('action', sql.NVarChar(100), action)
        .input('targetType', sql.NVarChar(30), 'document')
        .input('targetId', sql.Int, documentId)
        .query(`
            INSERT INTO dbo.UserActivityLogs (userId, action, targetType, targetId)
            VALUES (@userId, @action, @targetType, @targetId);
        `);
};

const deleteDocumentById = async ({ documentId, deletedByUserId }) => {
    const pool = getPool();

    await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .input('deletedByUserId', sql.Int, deletedByUserId)
        .query(`
            BEGIN TRY
                BEGIN TRANSACTION;

                DECLARE @reviewIds TABLE (reviewId INT PRIMARY KEY);
                DECLARE @questionIds TABLE (questionId INT PRIMARY KEY);
                DECLARE @commentIds TABLE (commentId INT PRIMARY KEY);
                DECLARE @answerIds TABLE (answerId INT PRIMARY KEY);

                INSERT INTO @reviewIds (reviewId)
                SELECT reviewId
                FROM dbo.DocumentReviews
                WHERE documentId = @documentId;

                INSERT INTO @questionIds (questionId)
                SELECT questionId
                FROM dbo.Questions
                WHERE documentId = @documentId;

                INSERT INTO @commentIds (commentId)
                SELECT commentId
                FROM dbo.Comments
                WHERE documentId = @documentId;

                INSERT INTO @answerIds (answerId)
                SELECT a.answerId
                FROM dbo.Answers a
                INNER JOIN @questionIds q ON q.questionId = a.questionId;

                DELETE r
                FROM dbo.Reports r
                WHERE r.documentId = @documentId
                   OR EXISTS (SELECT 1 FROM @questionIds q WHERE q.questionId = r.questionId)
                   OR EXISTS (SELECT 1 FROM @commentIds c WHERE c.commentId = r.commentId)
                   OR EXISTS (SELECT 1 FROM @answerIds a WHERE a.answerId = r.answerId);

                DELETE pt
                FROM dbo.PointTransactions pt
                WHERE pt.documentId = @documentId
                   OR EXISTS (SELECT 1 FROM @reviewIds rv WHERE rv.reviewId = pt.reviewId)
                   OR EXISTS (SELECT 1 FROM @answerIds a WHERE a.answerId = pt.answerId);

                DELETE FROM dbo.DownloadHistory
                WHERE documentId = @documentId;

                DELETE FROM dbo.DocumentReviews
                WHERE documentId = @documentId;

                DELETE FROM dbo.Comments
                WHERE documentId = @documentId;

                DELETE FROM dbo.Questions
                WHERE documentId = @documentId;

                DELETE FROM dbo.DocumentCategories
                WHERE documentId = @documentId;

                DELETE FROM dbo.Documents
                WHERE documentId = @documentId;

                IF @@ROWCOUNT = 0
                BEGIN
                    THROW 56602, N'Document not found.', 1;
                END;

                INSERT INTO dbo.UserActivityLogs (userId, action, targetType, targetId)
                VALUES (@deletedByUserId, N'delete_document', N'document', @documentId);

                COMMIT TRANSACTION;
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0
                    ROLLBACK TRANSACTION;
                THROW;
            END CATCH;
        `);
};

module.exports = {
    searchApprovedDocuments,
    getDocumentDetailById,
    createDocument,
    updateDocument,
    findDuplicateDocumentCandidates,
    getUploadedDocuments,
    getPendingDocuments,
    reviewDocument,
    updateDocumentStatus,
    logDocumentModerationAction,
    deleteDocumentById,
};
