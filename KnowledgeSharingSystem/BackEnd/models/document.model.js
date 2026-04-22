const { getPool, sql, isPostgresClient } = require('../utils/db');

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT DISTINCT
                    d.document_id AS "documentId",
                    d.title,
                    d.description,
                    d.file_url AS "fileUrl",
                    d.original_file_name AS "originalFileName",
                    d.file_size_bytes AS "fileSizeBytes",
                    d.mime_type AS "mimeType",
                    d.created_at AS "createdAt",
                    d.updated_at AS "updatedAt",
                    u.user_id AS "ownerUserId",
                    u.name AS "ownerName"
                FROM documents d
                INNER JOIN users u ON u.user_id = d.owner_user_id
                LEFT JOIN document_categories dc ON dc.document_id = d.document_id
                LEFT JOIN categories c ON c.category_id = dc.category_id
                WHERE d.status = 'approved'
                  AND (
                        $1::TEXT IS NULL
                        OR d.title ILIKE ('%' || $1 || '%')
                        OR COALESCE(d.description, '') ILIKE ('%' || $1 || '%')
                  )
                  AND (
                        $2::INT IS NULL
                        OR dc.category_id = $2
                  )
                  AND (
                        $3::TEXT IS NULL
                        OR c.name ILIKE ('%' || $3 || '%')
                  )
                ORDER BY d.created_at DESC;
            `,
            [keyword || null, categoryId || null, categoryKeyword || null]
        );

        return result.rows;
    }

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    d.document_id AS "documentId",
                    d.title,
                    d.description,
                    d.file_url AS "fileUrl",
                    d.original_file_name AS "originalFileName",
                    d.file_size_bytes AS "fileSizeBytes",
                    d.mime_type AS "mimeType",
                    d.file_hash AS "fileHash",
                    d.status,
                    d.created_at AS "createdAt",
                    d.updated_at AS "updatedAt",
                    u.user_id AS "ownerUserId",
                    u.name AS "ownerName",
                    u.email AS "ownerEmail"
                FROM documents d
                INNER JOIN users u ON u.user_id = d.owner_user_id
                WHERE d.document_id = $1;
            `,
            [documentId]
        );

        return result.rows[0] || null;
    }

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

    if (isPostgresClient()) {
        const categoryIdsRaw = normalizeCategoryIds(categoryIds);
        const parsedCategoryIds = categoryIdsRaw
            ? categoryIdsRaw
                .split(',')
                .map((value) => Number(String(value).trim()))
                .filter((value) => Number.isInteger(value) && value > 0)
            : [];

        const result = await pool.query(
            `
                WITH inserted AS (
                    INSERT INTO documents (
                        owner_user_id,
                        title,
                        description,
                        file_url,
                        original_file_name,
                        file_size_bytes,
                        mime_type,
                        file_hash,
                        status
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
                    RETURNING document_id
                )
                SELECT document_id AS "documentId"
                FROM inserted;
            `,
            [
                ownerUserId,
                title,
                description || null,
                fileUrl,
                originalFileName,
                fileSizeBytes,
                mimeType,
                fileHash || null,
            ]
        );

        const createdDocumentId = result.rows[0].documentId;

        if (parsedCategoryIds.length > 0) {
            await pool.query(
                `
                    INSERT INTO document_categories (document_id, category_id)
                    SELECT $1, category_id
                    FROM (
                        SELECT DISTINCT UNNEST($2::INT[]) AS category_id
                    ) c;
                `,
                [createdDocumentId, parsedCategoryIds]
            );
        }

        await pool.query(
            `
                INSERT INTO user_activity_logs (user_id, action, target_type, target_id)
                VALUES ($1, 'create_document', 'document', $2);
            `,
            [ownerUserId, createdDocumentId]
        );

        return createdDocumentId;
    }

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

    if (isPostgresClient()) {
        const categoryIdsRaw = normalizeCategoryIds(categoryIds);
        const parsedCategoryIds = categoryIdsRaw
            ? categoryIdsRaw
                .split(',')
                .map((value) => Number(String(value).trim()))
                .filter((value) => Number.isInteger(value) && value > 0)
            : [];

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(
                `
                    UPDATE documents
                    SET
                        title = $2,
                        description = $3,
                        file_url = $4,
                        original_file_name = $5,
                        file_size_bytes = $6,
                        mime_type = $7,
                        file_hash = $8,
                        updated_at = NOW()
                    WHERE document_id = $1;
                `,
                [
                    documentId,
                    title,
                    description || null,
                    fileUrl,
                    originalFileName,
                    fileSizeBytes,
                    mimeType,
                    fileHash || null,
                ]
            );

            await client.query(`DELETE FROM document_categories WHERE document_id = $1;`, [documentId]);
            if (parsedCategoryIds.length > 0) {
                await client.query(
                    `
                        INSERT INTO document_categories (document_id, category_id)
                        SELECT $1, category_id
                        FROM (SELECT DISTINCT UNNEST($2::INT[]) AS category_id) c;
                    `,
                    [documentId, parsedCategoryIds]
                );
            }
            await client.query('COMMIT');
            return;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    d.document_id AS "documentId",
                    d.title,
                    d.description,
                    d.owner_user_id AS "ownerUserId",
                    d.created_at AS "createdAt"
                FROM documents d
                WHERE d.document_id <> $1
                  AND d.status = 'approved'
                ORDER BY d.created_at DESC
                LIMIT 30;
            `,
            [documentId]
        );
        return result.rows;
    }

    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .execute('dbo.usp_FindDuplicateDocumentCandidates');

    return result.recordset;
};

const getUploadedDocuments = async ({ ownerUserId = null, status = null }) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    d.document_id AS "documentId",
                    d.title,
                    d.description,
                    d.file_url AS "fileUrl",
                    d.original_file_name AS "originalFileName",
                    d.file_size_bytes AS "fileSizeBytes",
                    d.mime_type AS "mimeType",
                    d.file_hash AS "fileHash",
                    d.status,
                    d.created_at AS "createdAt",
                    d.updated_at AS "updatedAt",
                    d.owner_user_id AS "ownerUserId",
                    u.name AS "ownerName",
                    u.email AS "ownerEmail",
                    latest_review.decision AS "latestReviewDecision",
                    latest_review.note AS "latestReviewNote",
                    latest_review.created_at AS "latestReviewedAt"
                FROM documents d
                INNER JOIN users u ON u.user_id = d.owner_user_id
                LEFT JOIN LATERAL (
                    SELECT dr.decision, dr.note, dr.created_at
                    FROM document_reviews dr
                    WHERE dr.document_id = d.document_id
                    ORDER BY dr.created_at DESC
                    LIMIT 1
                ) latest_review ON TRUE
                WHERE ($1::INT IS NULL OR d.owner_user_id = $1)
                  AND ($2::TEXT IS NULL OR d.status = $2)
                ORDER BY d.created_at DESC;
            `,
            [ownerUserId, status || null]
        );
        return result.rows;
    }

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

    if (isPostgresClient()) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const status = decision === 'approved' ? 'approved' : 'rejected';
            await client.query(
                `
                    UPDATE documents
                    SET
                        status = $2,
                        updated_at = NOW()
                    WHERE document_id = $1;
                `,
                [documentId, status]
            );
            await client.query(
                `
                    INSERT INTO document_reviews (document_id, moderator_user_id, decision, note)
                    VALUES ($1, $2, $3, $4);
                `,
                [documentId, moderatorUserId, decision, note]
            );
            await client.query('COMMIT');
            return;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                UPDATE documents
                SET
                    status = $2,
                    updated_at = NOW()
                WHERE document_id = $1;
            `,
            [documentId, status]
        );
        if (Number(result.rowCount || 0) === 0) {
            const error = new Error('Document not found.');
            error.statusCode = 404;
            throw error;
        }
        return;
    }

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

    if (isPostgresClient()) {
        await pool.query(
            `
                INSERT INTO user_activity_logs (user_id, action, target_type, target_id)
                VALUES ($1, $2, $3, $4);
            `,
            [userId, action, 'document', documentId]
        );
        return;
    }

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

const deleteDocumentById = async ({
    documentId,
    deletedByUserId,
    penaltyPoints = 0,
    penaltyNote = null,
}) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const ownerResult = await client.query(
                `
                    SELECT owner_user_id AS "ownerUserId"
                    FROM documents
                    WHERE document_id = $1
                    FOR UPDATE;
                `,
                [documentId]
            );
            const owner = ownerResult.rows[0];
            if (!owner) {
                const error = new Error('Document not found.');
                error.statusCode = 404;
                throw error;
            }

            await client.query(
                `
                    DELETE FROM point_transactions pt
                    WHERE pt.document_id = $1
                       OR pt.review_id IN (
                            SELECT dr.review_id
                            FROM document_reviews dr
                            WHERE dr.document_id = $1
                       )
                       OR pt.answer_id IN (
                            SELECT a.answer_id
                            FROM answers a
                            INNER JOIN questions q ON q.question_id = a.question_id
                            WHERE q.document_id = $1
                       );
                `,
                [documentId]
            );
            await client.query(`DELETE FROM reports WHERE document_id = $1;`, [documentId]);
            await client.query(`DELETE FROM download_history WHERE document_id = $1;`, [documentId]);
            await client.query(`DELETE FROM document_reviews WHERE document_id = $1;`, [documentId]);
            await client.query(`DELETE FROM comments WHERE document_id = $1;`, [documentId]);
            await client.query(`DELETE FROM questions WHERE document_id = $1;`, [documentId]);
            await client.query(`DELETE FROM document_categories WHERE document_id = $1;`, [documentId]);
            await client.query(`DELETE FROM document_reactions WHERE document_id = $1;`, [documentId]);
            await client.query(`DELETE FROM saved_documents WHERE document_id = $1;`, [documentId]);
            await client.query(`DELETE FROM documents WHERE document_id = $1;`, [documentId]);

            await client.query(
                `
                    INSERT INTO user_activity_logs (user_id, action, target_type, target_id)
                    VALUES ($1, 'delete_document', 'document', $2);
                `,
                [deletedByUserId, documentId]
            );

            let deductedPoints = 0;
            if (penaltyPoints > 0) {
                const pointsResult = await client.query(
                    `SELECT points FROM users WHERE user_id = $1 FOR UPDATE;`,
                    [owner.ownerUserId]
                );
                const currentPoints = Number(pointsResult.rows[0]?.points || 0);
                deductedPoints = Math.min(currentPoints, Number(penaltyPoints || 0));

                if (deductedPoints > 0) {
                    await client.query(
                        `
                            UPDATE users
                            SET
                                points = points - $2,
                                updated_at = NOW()
                            WHERE user_id = $1;
                        `,
                        [owner.ownerUserId, deductedPoints]
                    );

                    await client.query(
                        `
                            INSERT INTO point_transactions (
                                user_id, transaction_type, points, description, document_id, answer_id, review_id
                            )
                            VALUES ($1, 'penalty', $2, $3, NULL, NULL, NULL);
                        `,
                        [
                            owner.ownerUserId,
                            -deductedPoints,
                            penaltyNote || `Penalty for violating document #${documentId}`,
                        ]
                    );

                    await client.query(
                        `
                            INSERT INTO user_activity_logs (user_id, action, target_type, target_id)
                            VALUES ($1, 'deduct_points_on_delete', 'user', $2);
                        `,
                        [deletedByUserId, owner.ownerUserId]
                    );
                }
            }

            await client.query('COMMIT');
            return { deductedPoints };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .input('deletedByUserId', sql.Int, deletedByUserId)
        .input('penaltyPoints', sql.Int, penaltyPoints)
        .input('penaltyNote', sql.NVarChar(255), penaltyNote)
        .query(`
            BEGIN TRY
                BEGIN TRANSACTION;

                DECLARE @ownerUserId INT;
                DECLARE @reviewIds TABLE (reviewId INT PRIMARY KEY);
                DECLARE @questionIds TABLE (questionId INT PRIMARY KEY);
                DECLARE @commentIds TABLE (commentId INT PRIMARY KEY);
                DECLARE @answerIds TABLE (answerId INT PRIMARY KEY);

                SELECT @ownerUserId = d.ownerUserId
                FROM dbo.Documents d
                WHERE d.documentId = @documentId;

                IF @ownerUserId IS NULL
                BEGIN
                    THROW 56602, N'Document not found.', 1;
                END;

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

                DELETE FROM dbo.DocumentReactions
                WHERE documentId = @documentId;

                DELETE FROM dbo.SavedDocuments
                WHERE documentId = @documentId;

                DELETE FROM dbo.Documents
                WHERE documentId = @documentId;

                IF @@ROWCOUNT = 0
                BEGIN
                    THROW 56602, N'Document not found.', 1;
                END;

                INSERT INTO dbo.UserActivityLogs (userId, action, targetType, targetId)
                VALUES (@deletedByUserId, N'delete_document', N'document', @documentId);

                DECLARE @deductedPoints INT = 0;

                IF @penaltyPoints > 0
                BEGIN
                    SELECT @deductedPoints =
                        CASE
                            WHEN u.points >= @penaltyPoints THEN @penaltyPoints
                            ELSE u.points
                        END
                    FROM dbo.Users u
                    WHERE u.userId = @ownerUserId;

                    IF @deductedPoints > 0
                    BEGIN
                        UPDATE dbo.Users
                        SET
                            points = points - @deductedPoints,
                            updatedAt = SYSDATETIME()
                        WHERE userId = @ownerUserId;

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
                            @ownerUserId,
                            N'penalty',
                            -@deductedPoints,
                            COALESCE(@penaltyNote, CONCAT(N'Penalty for violating document #', @documentId)),
                            NULL,
                            NULL,
                            NULL
                        );

                        INSERT INTO dbo.UserActivityLogs (userId, action, targetType, targetId)
                        VALUES (@deletedByUserId, N'deduct_points_on_delete', N'user', @ownerUserId);
                    END;
                END;

                COMMIT TRANSACTION;

                SELECT @deductedPoints AS deductedPoints;
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0
                    ROLLBACK TRANSACTION;
                THROW;
            END CATCH;
        `);

    return {
        deductedPoints: result.recordset[0]?.deductedPoints || 0,
    };
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
