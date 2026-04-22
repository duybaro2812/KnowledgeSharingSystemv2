const { getPool, sql, isPostgresClient } = require('../utils/db');

const getCommentsByDocumentId = async ({
    documentId,
    includeHidden = false,
    viewerUserId = null,
    viewerRole = null,
}) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    c.comment_id AS "commentId",
                    c.document_id AS "documentId",
                    c.parent_comment_id AS "parentCommentId",
                    c.author_user_id AS "authorUserId",
                    u.name AS "authorName",
                    c.content,
                    c.status,
                    c.reviewed_by_user_id AS "reviewedByUserId",
                    c.review_note AS "reviewNote",
                    c.reviewed_at AS "reviewedAt",
                    c.created_at AS "createdAt",
                    c.updated_at AS "updatedAt",
                    pe.event_id AS "pointEventId",
                    pe.status AS "pointEventStatus",
                    pe.points AS "pointEventPoints",
                    pe.reviewed_at AS "pointEventReviewedAt",
                    pe.review_note AS "pointEventReviewNote",
                    pe.reviewed_by_user_id AS "pointEventReviewedByUserId",
                    ru.name AS "pointEventReviewedByName"
                FROM comments c
                INNER JOIN users u ON u.user_id = c.author_user_id
                INNER JOIN documents d ON d.document_id = c.document_id
                LEFT JOIN LATERAL (
                    SELECT
                        pe_inner.event_id,
                        pe_inner.status,
                        pe_inner.points,
                        pe_inner.reviewed_at,
                        pe_inner.review_note,
                        pe_inner.reviewed_by_user_id
                    FROM point_events pe_inner
                    WHERE pe_inner.comment_id = c.comment_id
                      AND pe_inner.event_type = 'comment_given'
                      AND pe_inner.user_id = c.author_user_id
                    ORDER BY pe_inner.event_id DESC
                    LIMIT 1
                ) pe ON TRUE
                LEFT JOIN users ru ON ru.user_id = pe.reviewed_by_user_id
                WHERE c.document_id = $1
                  AND (
                        $2::BOOLEAN = TRUE
                        OR c.status = 'approved'
                        OR (
                            $3::INT IS NOT NULL
                            AND c.author_user_id = $3
                            AND c.status IN ('pending', 'rejected')
                        )
                        OR (
                            $4::TEXT IN ('moderator', 'admin')
                            AND c.status IN ('pending', 'rejected')
                        )
                  )
                  AND (
                        $2::BOOLEAN = TRUE
                        OR d.status = 'approved'
                  )
                ORDER BY c.created_at DESC;
            `,
            [documentId, includeHidden, viewerUserId, viewerRole]
        );

        return result.rows;
    }

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    c.comment_id AS "commentId",
                    c.document_id AS "documentId",
                    c.parent_comment_id AS "parentCommentId",
                    c.author_user_id AS "authorUserId",
                    u.name AS "authorName",
                    c.content,
                    c.status,
                    c.reviewed_by_user_id AS "reviewedByUserId",
                    c.review_note AS "reviewNote",
                    c.reviewed_at AS "reviewedAt",
                    c.created_at AS "createdAt",
                    c.updated_at AS "updatedAt"
                FROM comments c
                INNER JOIN users u ON u.user_id = c.author_user_id
                WHERE c.comment_id = $1;
            `,
            [commentId]
        );

        return result.rows[0] || null;
    }

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

    if (isPostgresClient()) {
        const checkDoc = await pool.query(
            `
                SELECT 1 AS ok
                FROM documents
                WHERE document_id = $1
                  AND status = 'approved'
                LIMIT 1;
            `,
            [documentId]
        );
        if (!checkDoc.rows[0]) {
            const error = new Error('Chi duoc binh luan tren tai lieu da approved.');
            error.statusCode = 400;
            throw error;
        }

        const result = await pool.query(
            `
                INSERT INTO comments (document_id, author_user_id, content, status)
                VALUES ($1, $2, $3, 'approved')
                RETURNING comment_id AS "commentId";
            `,
            [documentId, authorUserId, content]
        );
        return result.rows[0]?.commentId || null;
    }

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

    if (isPostgresClient()) {
        const parentResult = await pool.query(
            `
                SELECT c.document_id AS "documentId", c.status AS "parentStatus"
                FROM comments c
                WHERE c.comment_id = $1;
            `,
            [parentCommentId]
        );

        const parent = parentResult.rows[0];
        if (!parent) {
            const error = new Error('Parent comment not found.');
            error.statusCode = 404;
            throw error;
        }

        if (parent.parentStatus !== 'approved') {
            const error = new Error('Cannot reply to a non-approved comment.');
            error.statusCode = 400;
            throw error;
        }

        const documentCheck = await pool.query(
            `
                SELECT 1 AS ok
                FROM documents
                WHERE document_id = $1
                  AND status = 'approved'
                LIMIT 1;
            `,
            [parent.documentId]
        );
        if (!documentCheck.rows[0]) {
            const error = new Error('Only approved documents can receive replies.');
            error.statusCode = 400;
            throw error;
        }

        const insertResult = await pool.query(
            `
                INSERT INTO comments (document_id, parent_comment_id, author_user_id, content, status)
                VALUES ($1, $2, $3, $4, 'approved')
                RETURNING comment_id AS "commentId";
            `,
            [parent.documentId, parentCommentId, authorUserId, content]
        );

        return insertResult.rows[0]?.commentId || null;
    }

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                UPDATE comments
                SET
                    status = $2,
                    updated_at = NOW()
                WHERE comment_id = $1;
            `,
            [commentId, status]
        );
        return Number(result.rowCount || 0);
    }

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    d.document_id AS "documentId",
                    d.title AS "documentTitle",
                    d.owner_user_id AS "ownerUserId"
                FROM documents d
                WHERE d.document_id = $1;
            `,
            [documentId]
        );
        return result.rows[0] || null;
    }

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT DISTINCT c.author_user_id AS "userId"
                FROM comments c
                WHERE c.document_id = $1
                  AND c.status = 'approved'
                  AND ($2::INT IS NULL OR c.author_user_id <> $2);
            `,
            [documentId, excludeUserId]
        );

        return result.rows
            .map((row) => Number(row.userId))
            .filter((id) => Number.isInteger(id) && id > 0);
    }

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT COUNT(1)::INT AS total
                FROM comments c
                WHERE c.author_user_id = $1
                  AND c.created_at >= (NOW() - (($2::TEXT || ' seconds')::INTERVAL));
            `,
            [userId, safeWindow]
        );
        return Number(result.rows[0]?.total || 0);
    }

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    c.comment_id AS "commentId",
                    c.document_id AS "documentId",
                    d.title AS "documentTitle",
                    c.parent_comment_id AS "parentCommentId",
                    c.author_user_id AS "authorUserId",
                    u.name AS "authorName",
                    c.content,
                    c.status,
                    c.reviewed_by_user_id AS "reviewedByUserId",
                    c.review_note AS "reviewNote",
                    c.reviewed_at AS "reviewedAt",
                    c.created_at AS "createdAt",
                    c.updated_at AS "updatedAt"
                FROM comments c
                INNER JOIN users u ON u.user_id = c.author_user_id
                INNER JOIN documents d ON d.document_id = c.document_id
                WHERE c.status = 'pending'
                  AND ($3::INT IS NULL OR c.document_id = $3)
                ORDER BY c.created_at ASC
                LIMIT $1 OFFSET $2;
            `,
            [safeLimit, safeOffset, documentId]
        );
        return result.rows;
    }

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                UPDATE comments
                SET
                    status = $2,
                    reviewed_by_user_id = $3,
                    review_note = $4,
                    reviewed_at = NOW(),
                    updated_at = NOW()
                WHERE comment_id = $1
                  AND status = 'pending';
            `,
            [commentId, decision, reviewerUserId, reviewNote]
        );
        return Number(result.rowCount || 0);
    }

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    c.comment_id AS "commentId",
                    c.author_user_id AS "authorUserId",
                    c.parent_comment_id AS "parentCommentId",
                    COALESCE(pc.author_user_id, d.owner_user_id) AS "targetUserId"
                FROM comments c
                INNER JOIN documents d ON d.document_id = c.document_id
                LEFT JOIN comments pc ON pc.comment_id = c.parent_comment_id
                WHERE c.comment_id = $1;
            `,
            [commentId]
        );
        return result.rows[0] || null;
    }

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
