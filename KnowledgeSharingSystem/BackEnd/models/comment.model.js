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
                            AND c.status IN ('pending', 'rejected', 'hidden')
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
                        AND c.status IN (N'pending', N'rejected', N'hidden')
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

const restoreHiddenComment = async ({ commentId, reviewerUserId }) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                UPDATE comments
                SET
                    status = 'approved',
                    reviewed_by_user_id = $2,
                    review_note = NULL,
                    reviewed_at = NOW(),
                    updated_at = NOW()
                WHERE comment_id = $1
                  AND status = 'hidden';
            `,
            [commentId, reviewerUserId]
        );
        return Number(result.rowCount || 0);
    }

    const result = await pool
        .request()
        .input('commentId', sql.Int, commentId)
        .input('reviewerUserId', sql.Int, reviewerUserId)
        .query(`
            UPDATE dbo.Comments
            SET
                status = N'approved',
                reviewedByUserId = @reviewerUserId,
                reviewNote = NULL,
                reviewedAt = SYSDATETIME(),
                updatedAt = SYSDATETIME()
            WHERE commentId = @commentId
              AND status = N'hidden';

            SELECT @@ROWCOUNT AS affectedRows;
        `);

    return result.recordset[0]?.affectedRows || 0;
};

const deleteHiddenCommentForModeration = async ({
    commentId,
    moderatorUserId,
    reason,
    penaltyPoints = 0,
}) => {
    const pool = getPool();
    const safePenalty = Number.isInteger(Number(penaltyPoints)) ? Math.max(0, Number(penaltyPoints)) : 0;
    const safeReason = String(reason || '').trim();
    const penaltyDescription = `Penalty for deleted comment #${commentId}: ${safeReason}`.slice(0, 255);

    if (isPostgresClient()) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const existingResult = await client.query(
                `
                    SELECT
                        c.comment_id AS "commentId",
                        c.document_id AS "documentId",
                        c.author_user_id AS "authorUserId",
                        c.content,
                        c.status,
                        u.points AS "authorPoints"
                    FROM comments c
                    INNER JOIN users u ON u.user_id = c.author_user_id
                    WHERE c.comment_id = $1
                    FOR UPDATE OF c;
                `,
                [commentId]
            );
            const existingComment = existingResult.rows[0];

            if (!existingComment) {
                const error = new Error('Comment not found.');
                error.statusCode = 404;
                throw error;
            }

            if (String(existingComment.status || '').toLowerCase() !== 'hidden') {
                const error = new Error('Only hidden comments can be permanently deleted by moderation.');
                error.statusCode = 400;
                throw error;
            }

            const targetResult = await client.query(
                `
                    WITH RECURSIVE target_comments AS (
                        SELECT comment_id
                        FROM comments
                        WHERE comment_id = $1
                        UNION ALL
                        SELECT c.comment_id
                        FROM comments c
                        INNER JOIN target_comments tc ON tc.comment_id = c.parent_comment_id
                    )
                    SELECT COALESCE(ARRAY_AGG(comment_id), ARRAY[]::INTEGER[]) AS "commentIds"
                    FROM target_comments;
                `,
                [commentId]
            );
            const commentIds = targetResult.rows[0]?.commentIds || [commentId];

            let deductedPoints = 0;
            if (safePenalty > 0) {
                const pointsResult = await client.query(
                    `SELECT points FROM users WHERE user_id = $1 FOR UPDATE;`,
                    [existingComment.authorUserId]
                );
                const currentPoints = Number(pointsResult.rows[0]?.points || 0);
                deductedPoints = Math.min(currentPoints, safePenalty);

                if (deductedPoints > 0) {
                    await client.query(
                        `
                            UPDATE users
                            SET
                                points = points - $2,
                                updated_at = NOW()
                            WHERE user_id = $1;
                        `,
                        [existingComment.authorUserId, deductedPoints]
                    );

                    await client.query(
                        `
                            INSERT INTO point_transactions (
                                user_id, transaction_type, points, description, document_id, answer_id, review_id
                            )
                            VALUES ($1, 'penalty', $2, $3, $4, NULL, NULL);
                        `,
                        [
                            existingComment.authorUserId,
                            -deductedPoints,
                            penaltyDescription,
                            existingComment.documentId,
                        ]
                    );
                }
            }

            await client.query(`DELETE FROM reports WHERE comment_id = ANY($1::INTEGER[]);`, [commentIds]);
            await client.query(`DELETE FROM hidden_knowledge_sources WHERE comment_id = ANY($1::INTEGER[]);`, [commentIds]);
            await client.query(`DELETE FROM point_events WHERE comment_id = ANY($1::INTEGER[]);`, [commentIds]);
            await client.query(`UPDATE comments SET parent_comment_id = NULL WHERE comment_id = ANY($1::INTEGER[]);`, [commentIds]);
            await client.query(`DELETE FROM comments WHERE comment_id = ANY($1::INTEGER[]);`, [commentIds]);

            await client.query(
                `
                    INSERT INTO user_activity_logs (user_id, action, target_type, target_id)
                    VALUES ($1, 'delete_comment_moderation', 'comment', $2);
                `,
                [moderatorUserId, commentId]
            );

            await client.query('COMMIT');
            return {
                commentId,
                documentId: existingComment.documentId,
                authorUserId: existingComment.authorUserId,
                content: existingComment.content,
                deletedCommentIds: commentIds,
                deductedPoints,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    const result = await pool
        .request()
        .input('commentId', sql.Int, commentId)
        .input('moderatorUserId', sql.Int, moderatorUserId)
        .input('reason', sql.NVarChar(255), safeReason)
        .input('penaltyDescription', sql.NVarChar(255), penaltyDescription)
        .input('penaltyPoints', sql.Int, safePenalty)
        .query(`
            BEGIN TRY
                BEGIN TRANSACTION;

                DECLARE @documentId INT;
                DECLARE @authorUserId INT;
                DECLARE @content NVARCHAR(MAX);
                DECLARE @status NVARCHAR(20);
                DECLARE @deletedCommentIds NVARCHAR(MAX);
                DECLARE @deductedPoints INT = 0;
                DECLARE @targetComments TABLE (commentId INT PRIMARY KEY);

                SELECT
                    @documentId = c.documentId,
                    @authorUserId = c.authorUserId,
                    @content = c.content,
                    @status = c.status
                FROM dbo.Comments c WITH (UPDLOCK, HOLDLOCK)
                WHERE c.commentId = @commentId;

                IF @documentId IS NULL
                BEGIN
                    THROW 57110, N'Comment not found.', 1;
                END;

                IF @status <> N'hidden'
                BEGIN
                    THROW 57111, N'Only hidden comments can be permanently deleted by moderation.', 1;
                END;

                ;WITH targetComments AS (
                    SELECT commentId
                    FROM dbo.Comments
                    WHERE commentId = @commentId
                    UNION ALL
                    SELECT c.commentId
                    FROM dbo.Comments c
                    INNER JOIN targetComments tc ON tc.commentId = c.parentCommentId
                )
                INSERT INTO @targetComments (commentId)
                SELECT commentId
                FROM targetComments;

                IF @penaltyPoints > 0
                BEGIN
                    SELECT @deductedPoints =
                        CASE
                            WHEN u.points >= @penaltyPoints THEN @penaltyPoints
                            ELSE u.points
                        END
                    FROM dbo.Users u WITH (UPDLOCK, HOLDLOCK)
                    WHERE u.userId = @authorUserId;

                    IF @deductedPoints > 0
                    BEGIN
                        UPDATE dbo.Users
                        SET
                            points = points - @deductedPoints,
                            updatedAt = SYSDATETIME()
                        WHERE userId = @authorUserId;

                        INSERT INTO dbo.PointTransactions (
                            userId,
                            transactionType,
                            points,
                            description,
                            documentId,
                            answerId,
                            reviewId
                        )
                        VALUES (
                            @authorUserId,
                            N'penalty',
                            -@deductedPoints,
                            @penaltyDescription,
                            @documentId,
                            NULL,
                            NULL
                        );
                    END;
                END;

                DELETE r
                FROM dbo.Reports r
                WHERE EXISTS (SELECT 1 FROM @targetComments tc WHERE tc.commentId = r.commentId);

                DELETE hks
                FROM dbo.HiddenKnowledgeSources hks
                WHERE EXISTS (SELECT 1 FROM @targetComments tc WHERE tc.commentId = hks.commentId);

                DELETE pe
                FROM dbo.PointEvents pe
                WHERE EXISTS (SELECT 1 FROM @targetComments tc WHERE tc.commentId = pe.commentId);

                UPDATE c
                SET parentCommentId = NULL
                FROM dbo.Comments c
                WHERE EXISTS (SELECT 1 FROM @targetComments tc WHERE tc.commentId = c.commentId);

                DELETE c
                FROM dbo.Comments c
                WHERE EXISTS (SELECT 1 FROM @targetComments tc WHERE tc.commentId = c.commentId);

                SELECT @deletedCommentIds = STRING_AGG(CAST(commentId AS NVARCHAR(20)), N',')
                FROM @targetComments;

                INSERT INTO dbo.UserActivityLogs (userId, action, targetType, targetId)
                VALUES (@moderatorUserId, N'delete_comment_moderation', N'comment', @commentId);

                COMMIT TRANSACTION;

                SELECT
                    @commentId AS commentId,
                    @documentId AS documentId,
                    @authorUserId AS authorUserId,
                    @content AS content,
                    @deductedPoints AS deductedPoints,
                    @deletedCommentIds AS deletedCommentIds;
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0
                BEGIN
                    ROLLBACK TRANSACTION;
                END;
                THROW;
            END CATCH;
        `);

    const row = result.recordset[0];
    return {
        commentId,
        documentId: row?.documentId,
        authorUserId: row?.authorUserId,
        content: row?.content,
        deductedPoints: Number(row?.deductedPoints || 0),
        deletedCommentIds: String(row?.deletedCommentIds || '')
            .split(',')
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value > 0),
    };
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

const getCommentsForModeration = async ({ limit = 100, offset = 0, documentId = null, status = null }) => {
    const pool = getPool();

    const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 1000) : 100;
    const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;
    const normalizedStatus = status ? String(status).toLowerCase() : null;

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
                    u.email AS "authorEmail",
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
                WHERE ($4::TEXT IS NULL OR c.status = $4)
                  AND ($3::INT IS NULL OR c.document_id = $3)
                ORDER BY
                    CASE WHEN c.status = 'pending' THEN 0 ELSE 1 END,
                    COALESCE(c.reviewed_at, c.updated_at, c.created_at) DESC
                LIMIT $1 OFFSET $2;
            `,
            [safeLimit, safeOffset, documentId, normalizedStatus]
        );
        return result.rows;
    }

    const result = await pool
        .request()
        .input('limit', sql.Int, safeLimit)
        .input('offset', sql.Int, safeOffset)
        .input('documentId', sql.Int, documentId)
        .input('status', sql.NVarChar(20), normalizedStatus)
        .query(`
            SELECT
                c.commentId,
                c.documentId,
                d.title AS documentTitle,
                c.parentCommentId,
                c.authorUserId,
                u.name AS authorName,
                u.email AS authorEmail,
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
            WHERE (@status IS NULL OR c.status = @status)
              AND (@documentId IS NULL OR c.documentId = @documentId)
            ORDER BY
                CASE WHEN c.status = N'pending' THEN 0 ELSE 1 END,
                COALESCE(c.reviewedAt, c.updatedAt, c.createdAt) DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
        `);

    return result.recordset;
};

const getPendingCommentsForModeration = async ({ limit = 100, offset = 0, documentId = null }) => {
    return getCommentsForModeration({ limit, offset, documentId, status: 'pending' });
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
    restoreHiddenComment,
    deleteHiddenCommentForModeration,
    getDocumentOwnerForComments,
    getCommentParticipantUserIds,
    countRecentCommentsByUser,
    getCommentsForModeration,
    getPendingCommentsForModeration,
    reviewCommentStatus,
    getCommentRewardTargetUserId,
};
