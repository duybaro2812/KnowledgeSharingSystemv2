const { getPool, sql } = require('../utils/db');

const getCommentsByDocumentId = async ({
    documentId,
    includeHidden = false,
    viewerUserId = null,
    viewerRole = null,
}) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .input('includeHidden', sql.Bit, includeHidden ? 1 : 0)
        .input('viewerUserId', sql.Int, viewerUserId)
        .input('viewerRole', sql.NVarChar(20), viewerRole)
        .query(`
            SELECT
                c.commentId,
                c.documentId,
                c.parentCommentId,
                c.authorUserId,
                u.name AS authorName,
                c.content,
                c.status,
                c.reviewedByUserId,
                c.reviewNote,
                c.reviewedAt,
                c.createdAt,
                c.updatedAt,
                pe.eventId AS pointEventId,
                pe.status AS pointEventStatus,
                pe.points AS pointEventPoints,
                pe.reviewedAt AS pointEventReviewedAt,
                pe.reviewNote AS pointEventReviewNote,
                pe.reviewedByUserId AS pointEventReviewedByUserId,
                ru.name AS pointEventReviewedByName
            FROM dbo.Comments c
            INNER JOIN dbo.Users u ON u.userId = c.authorUserId
            INNER JOIN dbo.Documents d ON d.documentId = c.documentId
            OUTER APPLY (
                SELECT TOP 1
                    peInner.eventId,
                    peInner.status,
                    peInner.points,
                    peInner.reviewedAt,
                    peInner.reviewNote,
                    peInner.reviewedByUserId
                FROM dbo.PointEvents peInner
                WHERE peInner.commentId = c.commentId
                  AND peInner.eventType = N'comment_given'
                  AND peInner.userId = c.authorUserId
                ORDER BY peInner.eventId DESC
            ) pe
            LEFT JOIN dbo.Users ru ON ru.userId = pe.reviewedByUserId
            WHERE c.documentId = @documentId
              AND (
                    @includeHidden = 1
                    OR c.status = N'approved'
                    OR (
                        @viewerUserId IS NOT NULL
                        AND c.authorUserId = @viewerUserId
                        AND c.status IN (N'pending', N'rejected')
                    )
                    OR (
                        @viewerRole IN (N'moderator', N'admin')
                        AND c.status IN (N'pending', N'rejected')
                    )
              )
              AND (
                    @includeHidden = 1
                    OR d.status = N'approved'
              )
            ORDER BY c.createdAt DESC;
        `);

    return result.recordset;
};

const getCommentById = async (commentId) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('commentId', sql.Int, commentId)
        .query(`
            SELECT
                c.commentId,
                c.documentId,
                c.parentCommentId,
                c.authorUserId,
                u.name AS authorName,
                c.content,
                c.status,
                c.reviewedByUserId,
                c.reviewNote,
                c.reviewedAt,
                c.createdAt,
                c.updatedAt
            FROM dbo.Comments c
            INNER JOIN dbo.Users u ON u.userId = c.authorUserId
            WHERE c.commentId = @commentId;
        `);

    return result.recordset[0] || null;
};

const createComment = async ({ documentId, authorUserId, content }) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .input('authorUserId', sql.Int, authorUserId)
        .input('content', sql.NVarChar(sql.MAX), content)
        .query(`
            IF NOT EXISTS (
                SELECT 1
                FROM dbo.Documents
                WHERE documentId = @documentId
                  AND status = N'approved'
            )
            BEGIN
                THROW 55301, N'Chi duoc binh luan tren tai lieu da approved.', 1;
            END;

            INSERT INTO dbo.Comments (documentId, authorUserId, content, status)
            VALUES (@documentId, @authorUserId, @content, N'approved');

            SELECT CAST(SCOPE_IDENTITY() AS INT) AS commentId;
        `);

    return result.recordset[0]?.commentId || null;
};

const createReplyComment = async ({ parentCommentId, authorUserId, content }) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('parentCommentId', sql.Int, parentCommentId)
        .input('authorUserId', sql.Int, authorUserId)
        .input('content', sql.NVarChar(sql.MAX), content)
        .query(`
            DECLARE @documentId INT;
            DECLARE @parentStatus NVARCHAR(20);

            SELECT
                @documentId = c.documentId,
                @parentStatus = c.status
            FROM dbo.Comments c
            WHERE c.commentId = @parentCommentId;

            IF @documentId IS NULL
            BEGIN
                THROW 57101, N'Parent comment not found.', 1;
            END;

            IF @parentStatus <> N'approved'
            BEGIN
                THROW 57102, N'Cannot reply to a non-approved comment.', 1;
            END;

            IF NOT EXISTS (
                SELECT 1
                FROM dbo.Documents d
                WHERE d.documentId = @documentId
                  AND d.status = N'approved'
            )
            BEGIN
                THROW 57103, N'Only approved documents can receive replies.', 1;
            END;

            INSERT INTO dbo.Comments (
                documentId,
                parentCommentId,
                authorUserId,
                content,
                status
            )
            VALUES (
                @documentId,
                @parentCommentId,
                @authorUserId,
                @content,
                N'approved'
            );

            SELECT CAST(SCOPE_IDENTITY() AS INT) AS commentId;
        `);

    return result.recordset[0]?.commentId || null;
};

const updateCommentStatus = async ({ commentId, status }) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('commentId', sql.Int, commentId)
        .input('status', sql.NVarChar(20), status)
        .query(`
            UPDATE dbo.Comments
            SET
                status = @status,
                updatedAt = SYSDATETIME()
            WHERE commentId = @commentId;

            SELECT @@ROWCOUNT AS affectedRows;
        `);

    return result.recordset[0]?.affectedRows || 0;
};

const getDocumentOwnerForComments = async (documentId) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .query(`
            SELECT
                d.documentId,
                d.title AS documentTitle,
                d.ownerUserId
            FROM dbo.Documents d
            WHERE d.documentId = @documentId;
        `);

    return result.recordset[0] || null;
};

const getCommentParticipantUserIds = async ({ documentId, excludeUserId = null }) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .input('excludeUserId', sql.Int, excludeUserId)
        .query(`
            SELECT DISTINCT c.authorUserId AS userId
            FROM dbo.Comments c
            WHERE c.documentId = @documentId
              AND c.status = N'approved'
              AND (@excludeUserId IS NULL OR c.authorUserId <> @excludeUserId);
        `);

    return result.recordset.map((row) => Number(row.userId)).filter((id) => Number.isInteger(id) && id > 0);
};

const countRecentCommentsByUser = async ({ userId, windowSeconds }) => {
    const pool = getPool();

    const safeWindow = Number.isInteger(windowSeconds) && windowSeconds > 0 ? windowSeconds : 30;

    const result = await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('windowSeconds', sql.Int, safeWindow)
        .query(`
            SELECT COUNT(1) AS total
            FROM dbo.Comments c
            WHERE c.authorUserId = @userId
              AND c.createdAt >= DATEADD(SECOND, -@windowSeconds, SYSDATETIME());
        `);

    return Number(result.recordset[0]?.total || 0);
};

const getPendingCommentsForModeration = async ({ limit = 100, offset = 0, documentId = null }) => {
    const pool = getPool();

    const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 200) : 100;
    const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;

    const result = await pool
        .request()
        .input('limit', sql.Int, safeLimit)
        .input('offset', sql.Int, safeOffset)
        .input('documentId', sql.Int, documentId)
        .query(`
            SELECT
                c.commentId,
                c.documentId,
                d.title AS documentTitle,
                c.parentCommentId,
                c.authorUserId,
                u.name AS authorName,
                c.content,
                c.status,
                c.reviewedByUserId,
                c.reviewNote,
                c.reviewedAt,
                c.createdAt,
                c.updatedAt
            FROM dbo.Comments c
            INNER JOIN dbo.Users u ON u.userId = c.authorUserId
            INNER JOIN dbo.Documents d ON d.documentId = c.documentId
            WHERE c.status = N'pending'
              AND (@documentId IS NULL OR c.documentId = @documentId)
            ORDER BY c.createdAt ASC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
        `);

    return result.recordset;
};

const reviewCommentStatus = async ({ commentId, decision, reviewerUserId, reviewNote = null }) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('commentId', sql.Int, commentId)
        .input('decision', sql.NVarChar(20), decision)
        .input('reviewerUserId', sql.Int, reviewerUserId)
        .input('reviewNote', sql.NVarChar(255), reviewNote)
        .query(`
            UPDATE dbo.Comments
            SET
                status = @decision,
                reviewedByUserId = @reviewerUserId,
                reviewNote = @reviewNote,
                reviewedAt = SYSDATETIME(),
                updatedAt = SYSDATETIME()
            WHERE commentId = @commentId
              AND status = N'pending';

            SELECT @@ROWCOUNT AS affectedRows;
        `);

    return result.recordset[0]?.affectedRows || 0;
};

const getCommentRewardTargetUserId = async (commentId) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('commentId', sql.Int, commentId)
        .query(`
            SELECT
                c.commentId,
                c.authorUserId,
                c.parentCommentId,
                COALESCE(pc.authorUserId, d.ownerUserId) AS targetUserId
            FROM dbo.Comments c
            INNER JOIN dbo.Documents d ON d.documentId = c.documentId
            LEFT JOIN dbo.Comments pc ON pc.commentId = c.parentCommentId
            WHERE c.commentId = @commentId;
        `);

    return result.recordset[0] || null;
};

module.exports = {
    getCommentsByDocumentId,
    getCommentById,
    createComment,
    createReplyComment,
    updateCommentStatus,
    getDocumentOwnerForComments,
    getCommentParticipantUserIds,
    countRecentCommentsByUser,
    getPendingCommentsForModeration,
    reviewCommentStatus,
    getCommentRewardTargetUserId,
};
