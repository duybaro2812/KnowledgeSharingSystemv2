const { getPool, sql, isPostgresClient } = require('../utils/db');

const EVENT_TYPES = {
    UPLOAD_SUBMITTED: 'upload_submitted',
    UPLOAD_APPROVED: 'upload_approved',
    COMMENT_GIVEN: 'comment_given',
    COMMENT_RECEIVED: 'comment_received',
    UPVOTE_RECEIVED: 'upvote_received',
    DOCUMENT_VIEWED: 'document_viewed',
    DOCUMENT_SAVED_BY_OTHER: 'document_saved_by_other',
    QA_SESSION_RATED: 'qa_session_rated',
};

const EVENT_TO_TRANSACTION_TYPE = {
    upload_submitted: 'upload_reward',
    upload_approved: 'upload_reward',
    comment_given: 'moderation_reward',
    comment_received: 'moderation_reward',
    upvote_received: 'moderation_reward',
    document_viewed: 'moderation_reward',
    document_saved_by_other: 'moderation_reward',
    qa_session_rated: 'moderation_reward',
};

const createPointEvent = async ({
    userId,
    eventType,
    points,
    documentId = null,
    commentId = null,
    qaSessionId = null,
    sourceUserId = null,
    metadata = null,
}) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const metadataPayload = metadata ? JSON.stringify(metadata) : null;
        const result = await pool.query(
            `
                WITH existing AS (
                    SELECT pe.event_id AS "eventId", pe.status
                    FROM point_events pe
                    WHERE pe.user_id = $1
                      AND pe.event_type = $2
                      AND (
                            ($2 IN ('upload_submitted', 'upload_approved')
                                AND $4::INT IS NOT NULL
                                AND pe.document_id = $4)
                         OR ($2 IN ('comment_given', 'comment_received')
                                AND $5::INT IS NOT NULL
                                AND pe.comment_id = $5)
                         OR ($2 = 'qa_session_rated'
                                AND $6::INT IS NOT NULL
                                AND pe.qa_session_id = $6)
                         OR ($2 IN ('upvote_received', 'document_saved_by_other')
                                AND $4::INT IS NOT NULL
                                AND $7::INT IS NOT NULL
                                AND pe.document_id = $4
                                AND pe.source_user_id = $7)
                      )
                    ORDER BY pe.event_id DESC
                    LIMIT 1
                ),
                inserted AS (
                    INSERT INTO point_events (
                        user_id,
                        event_type,
                        points,
                        status,
                        document_id,
                        comment_id,
                        qa_session_id,
                        source_user_id,
                        metadata
                    )
                    SELECT $1, $2, $3, 'pending', $4, $5, $6, $7, $8
                    WHERE NOT EXISTS (SELECT 1 FROM existing)
                    RETURNING event_id AS "eventId", status
                )
                SELECT * FROM inserted
                UNION ALL
                SELECT * FROM existing
                LIMIT 1;
            `,
            [
                userId,
                eventType,
                points,
                documentId,
                commentId,
                qaSessionId,
                sourceUserId,
                metadataPayload,
            ]
        );

        return result.rows[0] || null;
    }

    const result = await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('eventType', sql.NVarChar(50), eventType)
        .input('points', sql.Int, points)
        .input('documentId', sql.Int, documentId)
        .input('commentId', sql.Int, commentId)
        .input('qaSessionId', sql.Int, qaSessionId)
        .input('sourceUserId', sql.Int, sourceUserId)
        .input('metadata', sql.NVarChar(sql.MAX), metadata ? JSON.stringify(metadata) : null)
        .query(`
            IF @eventType IN (N'upload_submitted', N'upload_approved')
               AND @documentId IS NOT NULL
               AND EXISTS (
                    SELECT 1
                    FROM dbo.PointEvents pe
                    WHERE pe.userId = @userId
                      AND pe.documentId = @documentId
                      AND pe.eventType = @eventType
               )
            BEGIN
                SELECT TOP 1 eventId, status
                FROM dbo.PointEvents
                WHERE userId = @userId
                  AND documentId = @documentId
                  AND eventType = @eventType
                ORDER BY eventId DESC;
                RETURN;
            END;

            IF @eventType IN (N'comment_given', N'comment_received')
               AND @commentId IS NOT NULL
               AND EXISTS (
                    SELECT 1
                    FROM dbo.PointEvents pe
                    WHERE pe.userId = @userId
                      AND pe.commentId = @commentId
                      AND pe.eventType = @eventType
               )
            BEGIN
                SELECT TOP 1 eventId, status
                FROM dbo.PointEvents
                WHERE userId = @userId
                  AND commentId = @commentId
                  AND eventType = @eventType
                ORDER BY eventId DESC;
                RETURN;
            END;

            IF @eventType = N'qa_session_rated'
               AND @qaSessionId IS NOT NULL
               AND EXISTS (
                    SELECT 1
                    FROM dbo.PointEvents pe
                    WHERE pe.userId = @userId
                      AND pe.qaSessionId = @qaSessionId
                      AND pe.eventType = @eventType
               )
            BEGIN
                SELECT TOP 1 eventId, status
                FROM dbo.PointEvents
                WHERE userId = @userId
                  AND qaSessionId = @qaSessionId
                  AND eventType = @eventType
                ORDER BY eventId DESC;
                RETURN;
            END;

            IF @eventType IN (N'upvote_received', N'document_saved_by_other')
               AND @documentId IS NOT NULL
               AND @sourceUserId IS NOT NULL
               AND EXISTS (
                    SELECT 1
                    FROM dbo.PointEvents pe
                    WHERE pe.userId = @userId
                      AND pe.documentId = @documentId
                      AND pe.sourceUserId = @sourceUserId
                      AND pe.eventType = @eventType
               )
            BEGIN
                SELECT TOP 1 eventId, status
                FROM dbo.PointEvents
                WHERE userId = @userId
                  AND documentId = @documentId
                  AND sourceUserId = @sourceUserId
                  AND eventType = @eventType
                ORDER BY eventId DESC;
                RETURN;
            END;

            INSERT INTO dbo.PointEvents (
                userId,
                eventType,
                points,
                status,
                documentId,
                commentId,
                qaSessionId,
                sourceUserId,
                metadata
            )
            VALUES (
                @userId,
                @eventType,
                @points,
                N'pending',
                @documentId,
                @commentId,
                @qaSessionId,
                @sourceUserId,
                @metadata
            );

            SELECT CAST(SCOPE_IDENTITY() AS INT) AS eventId, N'pending' AS status;
        `);

    return result.recordset[0] || null;
};

const getPendingPointEvents = async () => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    pe.event_id AS "eventId",
                    pe.user_id AS "userId",
                    u.username,
                    u.name AS "userName",
                    u.email AS "userEmail",
                    pe.event_type AS "eventType",
                    pe.points,
                    pe.status,
                    pe.document_id AS "documentId",
                    pe.comment_id AS "commentId",
                    pe.qa_session_id AS "qaSessionId",
                    pe.source_user_id AS "sourceUserId",
                    d.title AS "documentTitle",
                    pe.metadata,
                    pe.created_at AS "createdAt"
                FROM point_events pe
                INNER JOIN users u ON u.user_id = pe.user_id
                LEFT JOIN documents d ON d.document_id = pe.document_id
                WHERE pe.status = 'pending'
                ORDER BY pe.created_at ASC, pe.event_id ASC;
            `
        );
        return result.rows;
    }

    const result = await pool.request().query(`
        SELECT
            pe.eventId,
            pe.userId,
            u.username,
            u.name AS userName,
            u.email AS userEmail,
            pe.eventType,
            pe.points,
            pe.status,
            pe.documentId,
            pe.commentId,
            pe.qaSessionId,
            pe.sourceUserId,
            d.title AS documentTitle,
            pe.metadata,
            pe.createdAt
        FROM dbo.PointEvents pe
        INNER JOIN dbo.Users u ON u.userId = pe.userId
        LEFT JOIN dbo.Documents d ON d.documentId = pe.documentId
        WHERE pe.status = N'pending'
        ORDER BY pe.createdAt ASC, pe.eventId ASC;
    `);

    return result.recordset;
};

const reviewPointEvent = async ({
    eventId,
    reviewedByUserId,
    decision,
    reviewNote = null,
    pointDeltaOverride = null,
}) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const eventResult = await client.query(
                `
                    SELECT
                        pe.event_id AS "eventId",
                        pe.user_id AS "userId",
                        pe.event_type AS "eventType",
                        pe.points,
                        pe.status,
                        pe.document_id AS "documentId",
                        pe.comment_id AS "commentId",
                        pe.qa_session_id AS "qaSessionId"
                    FROM point_events pe
                    WHERE pe.event_id = $1
                    FOR UPDATE;
                `,
                [eventId]
            );
            const pointEvent = eventResult.rows[0];

            if (!pointEvent) {
                const error = new Error('Point event not found.');
                error.statusCode = 404;
                throw error;
            }

            const previousStatus = String(pointEvent.status || '').toLowerCase();
            const previousPoints = Number(pointEvent.points || 0);
            const nextApprovedPoints = Number.isInteger(pointDeltaOverride)
                ? pointDeltaOverride
                : previousPoints;

            let pointDelta = 0;
            if (decision === 'approved') {
                pointDelta = previousStatus === 'approved'
                    ? nextApprovedPoints - previousPoints
                    : nextApprovedPoints;
            } else if (decision === 'rejected' && previousStatus === 'approved') {
                pointDelta = -previousPoints;
            }

            await client.query(
                `
                    UPDATE point_events
                    SET
                        status = $2,
                        reviewed_by_user_id = $3,
                        review_note = $4,
                        points = CASE
                            WHEN $2 = 'approved' AND $5::INT IS NOT NULL THEN $5
                            ELSE points
                        END,
                        reviewed_at = NOW()
                    WHERE event_id = $1;
                `,
                [
                    eventId,
                    decision,
                    reviewedByUserId,
                    reviewNote,
                    decision === 'approved' && Number.isInteger(nextApprovedPoints)
                        ? nextApprovedPoints
                        : null,
                ]
            );

            let userPointsAfter = null;
            let approvedPoints = null;

            if (decision === 'approved') {
                const transactionType = EVENT_TO_TRANSACTION_TYPE[pointEvent.eventType] || 'admin_adjustment';
                approvedPoints = nextApprovedPoints;
                const description =
                    previousStatus === 'approved'
                        ? `Point reward adjusted for event ${pointEvent.eventType} (eventId=${pointEvent.eventId}).`
                        : `Point reward approved for event ${pointEvent.eventType} (eventId=${pointEvent.eventId}).`;

                if (pointDelta !== 0) {
                    const pointCheck = await client.query(
                        `SELECT points FROM users WHERE user_id = $1 FOR UPDATE;`,
                        [pointEvent.userId]
                    );
                    const currentPoints = pointCheck.rows[0]?.points;
                    if (typeof currentPoints !== 'number') {
                        const error = new Error('User for point event not found.');
                        error.statusCode = 404;
                        throw error;
                    }
                    if (currentPoints + pointDelta < 0) {
                        const error = new Error(
                            `Insufficient points for deduction. Current points: ${currentPoints}, requested delta: ${pointDelta}.`
                        );
                        error.statusCode = 400;
                        throw error;
                    }

                    await client.query(
                        `
                            UPDATE users
                            SET
                                points = points + $2,
                                updated_at = NOW()
                            WHERE user_id = $1;
                        `,
                        [pointEvent.userId, pointDelta]
                    );

                    await client.query(
                        `
                            INSERT INTO point_transactions (
                                user_id, transaction_type, points, description, document_id, answer_id, review_id
                            )
                            VALUES ($1, $2, $3, $4, $5, NULL, NULL);
                        `,
                        [pointEvent.userId, transactionType, pointDelta, description, pointEvent.documentId]
                    );
                }

                const balance = await client.query(
                    `SELECT points AS "userPointsAfter" FROM users WHERE user_id = $1;`,
                    [pointEvent.userId]
                );
                userPointsAfter = balance.rows[0]?.userPointsAfter ?? null;
            } else if (decision === 'rejected' && pointDelta !== 0) {
                const transactionType = EVENT_TO_TRANSACTION_TYPE[pointEvent.eventType] || 'admin_adjustment';
                const description = `Point reward reverted for rejected event ${pointEvent.eventType} (eventId=${pointEvent.eventId}).`;

                const pointCheck = await client.query(
                    `SELECT points FROM users WHERE user_id = $1 FOR UPDATE;`,
                    [pointEvent.userId]
                );
                const currentPoints = pointCheck.rows[0]?.points;
                if (typeof currentPoints !== 'number') {
                    const error = new Error('User for point event not found.');
                    error.statusCode = 404;
                    throw error;
                }
                if (currentPoints + pointDelta < 0) {
                    const error = new Error(
                        `Insufficient points for deduction. Current points: ${currentPoints}, requested delta: ${pointDelta}.`
                    );
                    error.statusCode = 400;
                    throw error;
                }

                await client.query(
                    `
                        UPDATE users
                        SET
                            points = points + $2,
                            updated_at = NOW()
                        WHERE user_id = $1;
                    `,
                    [pointEvent.userId, pointDelta]
                );

                await client.query(
                    `
                        INSERT INTO point_transactions (
                            user_id, transaction_type, points, description, document_id, answer_id, review_id
                        )
                        VALUES ($1, $2, $3, $4, $5, NULL, NULL);
                    `,
                    [pointEvent.userId, transactionType, pointDelta, description, pointEvent.documentId]
                );

                const balance = await client.query(
                    `SELECT points AS "userPointsAfter" FROM users WHERE user_id = $1;`,
                    [pointEvent.userId]
                );
                userPointsAfter = balance.rows[0]?.userPointsAfter ?? null;
            }

            await client.query('COMMIT');

            return {
                ...pointEvent,
                status: decision,
                reviewedByUserId,
                reviewNote,
                approvedPoints,
                userPointsAfter,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
        const request = new sql.Request(transaction);
        request.input('eventId', sql.Int, eventId);

        const eventResult = await request.query(`
            SELECT TOP 1
                pe.eventId,
                pe.userId,
                pe.eventType,
                pe.points,
                pe.status,
                pe.documentId,
                pe.commentId,
                pe.qaSessionId
            FROM dbo.PointEvents pe WITH (UPDLOCK, ROWLOCK)
            WHERE pe.eventId = @eventId;
        `);

        const pointEvent = eventResult.recordset[0];

        if (!pointEvent) {
            const error = new Error('Point event not found.');
            error.statusCode = 404;
            throw error;
        }

        if (!['pending', 'approved', 'rejected'].includes(String(pointEvent.status || '').toLowerCase())) {
            const error = new Error('Point event has invalid status for review.');
            error.statusCode = 400;
            throw error;
        }

        const previousStatus = String(pointEvent.status || '').toLowerCase();
        const previousPoints = Number(pointEvent.points || 0);

        const nextApprovedPoints = Number.isInteger(pointDeltaOverride)
            ? pointDeltaOverride
            : previousPoints;

        let pointDelta = 0;
        if (decision === 'approved') {
            if (previousStatus === 'approved') {
                pointDelta = nextApprovedPoints - previousPoints;
            } else {
                pointDelta = nextApprovedPoints;
            }
        } else if (decision === 'rejected' && previousStatus === 'approved') {
            pointDelta = -previousPoints;
        }

        const updateRequest = new sql.Request(transaction);
        updateRequest.input('eventId', sql.Int, eventId);
        updateRequest.input('status', sql.NVarChar(20), decision);
        updateRequest.input('reviewedByUserId', sql.Int, reviewedByUserId);
        updateRequest.input('reviewNote', sql.NVarChar(255), reviewNote);
        updateRequest.input(
            'nextApprovedPoints',
            sql.Int,
            decision === 'approved' && Number.isInteger(nextApprovedPoints) ? nextApprovedPoints : null
        );

        await updateRequest.query(`
            UPDATE dbo.PointEvents
            SET
                status = @status,
                reviewedByUserId = @reviewedByUserId,
                reviewNote = @reviewNote,
                points = CASE
                    WHEN @status = N'approved' AND @nextApprovedPoints IS NOT NULL THEN @nextApprovedPoints
                    ELSE points
                END,
                reviewedAt = SYSDATETIME()
            WHERE eventId = @eventId;
        `);

        let userPointsAfter = null;
        let approvedPoints = null;

        if (decision === 'approved') {
            const transactionType = EVENT_TO_TRANSACTION_TYPE[pointEvent.eventType] || 'admin_adjustment';
            approvedPoints = nextApprovedPoints;
            const description =
                previousStatus === 'approved'
                    ? `Point reward adjusted for event ${pointEvent.eventType} (eventId=${pointEvent.eventId}).`
                    : `Point reward approved for event ${pointEvent.eventType} (eventId=${pointEvent.eventId}).`;

            if (pointDelta !== 0) {
                const pointCheckRequest = new sql.Request(transaction);
                pointCheckRequest.input('userId', sql.Int, pointEvent.userId);
                const pointCheckResult = await pointCheckRequest.query(`
                    SELECT points
                    FROM dbo.Users
                    WHERE userId = @userId;
                `);

                const currentPoints = pointCheckResult.recordset[0]?.points;
                if (typeof currentPoints !== 'number') {
                    const error = new Error('User for point event not found.');
                    error.statusCode = 404;
                    throw error;
                }

                if (currentPoints + pointDelta < 0) {
                    const error = new Error(
                        `Insufficient points for deduction. Current points: ${currentPoints}, requested delta: ${pointDelta}.`
                    );
                    error.statusCode = 400;
                    throw error;
                }

                const rewardRequest = new sql.Request(transaction);
                rewardRequest.input('userId', sql.Int, pointEvent.userId);
                rewardRequest.input('pointDelta', sql.Int, pointDelta);
                rewardRequest.input('transactionType', sql.NVarChar(50), transactionType);
                rewardRequest.input('description', sql.NVarChar(255), description);
                rewardRequest.input('documentId', sql.Int, pointEvent.documentId);

                const rewardResult = await rewardRequest.query(`
                    IF NOT EXISTS (
                        SELECT 1
                        FROM dbo.Users
                        WHERE userId = @userId
                    )
                    BEGIN
                        THROW 56911, N'User for point event not found.', 1;
                    END;

                    UPDATE dbo.Users
                    SET
                        points = points + @pointDelta,
                        updatedAt = SYSDATETIME()
                    WHERE userId = @userId;

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
                        @userId,
                        @transactionType,
                        @pointDelta,
                        @description,
                        @documentId,
                        NULL,
                        NULL
                    );

                    SELECT points AS userPointsAfter
                    FROM dbo.Users
                    WHERE userId = @userId;
                `);

                userPointsAfter = rewardResult.recordset[0]?.userPointsAfter ?? null;
            } else {
                const balanceRequest = new sql.Request(transaction);
                balanceRequest.input('userId', sql.Int, pointEvent.userId);
                const balanceResult = await balanceRequest.query(`
                    SELECT points AS userPointsAfter
                    FROM dbo.Users
                    WHERE userId = @userId;
                `);
                userPointsAfter = balanceResult.recordset[0]?.userPointsAfter ?? null;
            }
        } else if (decision === 'rejected' && pointDelta !== 0) {
            const transactionType = EVENT_TO_TRANSACTION_TYPE[pointEvent.eventType] || 'admin_adjustment';
            const description = `Point reward reverted for rejected event ${pointEvent.eventType} (eventId=${pointEvent.eventId}).`;

            const pointCheckRequest = new sql.Request(transaction);
            pointCheckRequest.input('userId', sql.Int, pointEvent.userId);
            const pointCheckResult = await pointCheckRequest.query(`
                SELECT points
                FROM dbo.Users
                WHERE userId = @userId;
            `);

            const currentPoints = pointCheckResult.recordset[0]?.points;
            if (typeof currentPoints !== 'number') {
                const error = new Error('User for point event not found.');
                error.statusCode = 404;
                throw error;
            }

            if (currentPoints + pointDelta < 0) {
                const error = new Error(
                    `Insufficient points for deduction. Current points: ${currentPoints}, requested delta: ${pointDelta}.`
                );
                error.statusCode = 400;
                throw error;
            }

            const rewardRequest = new sql.Request(transaction);
            rewardRequest.input('userId', sql.Int, pointEvent.userId);
            rewardRequest.input('pointDelta', sql.Int, pointDelta);
            rewardRequest.input('transactionType', sql.NVarChar(50), transactionType);
            rewardRequest.input('description', sql.NVarChar(255), description);
            rewardRequest.input('documentId', sql.Int, pointEvent.documentId);

            const rewardResult = await rewardRequest.query(`
                UPDATE dbo.Users
                SET
                    points = points + @pointDelta,
                    updatedAt = SYSDATETIME()
                WHERE userId = @userId;

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
                    @userId,
                    @transactionType,
                    @pointDelta,
                    @description,
                    @documentId,
                    NULL,
                    NULL
                );

                SELECT points AS userPointsAfter
                FROM dbo.Users
                WHERE userId = @userId;
            `);

            userPointsAfter = rewardResult.recordset[0]?.userPointsAfter ?? null;
        }

        await transaction.commit();

        return {
            ...pointEvent,
            status: decision,
            reviewedByUserId,
            reviewNote,
            approvedPoints,
            userPointsAfter,
        };
    } catch (error) {
        if (transaction._aborted !== true) {
            await transaction.rollback();
        }
        throw error;
    }
};

module.exports = {
    EVENT_TYPES,
    createPointEvent,
    getPendingPointEvents,
    reviewPointEvent,
};
