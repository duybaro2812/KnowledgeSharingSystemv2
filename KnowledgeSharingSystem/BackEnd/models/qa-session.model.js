const { getPool, sql, isPostgresClient } = require('../utils/db');

const getSessionByIdForUser = async ({ sessionId, userId }) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    qs.session_id AS "sessionId",
                    qs.document_id AS "documentId",
                    d.title AS "documentTitle",
                    qs.asker_user_id AS "askerUserId",
                    asker.name AS "askerName",
                    qs.owner_user_id AS "ownerUserId",
                    owner.name AS "ownerName",
                    qs.status,
                    qs.created_at AS "createdAt",
                    qs.updated_at AS "updatedAt",
                    qs.closed_at AS "closedAt",
                    EXISTS (
                        SELECT 1
                        FROM session_ratings sr
                        WHERE sr.session_id = qs.session_id
                          AND sr.asker_user_id = $2
                    ) AS "hasRatedByCurrentUser"
                FROM question_sessions qs
                INNER JOIN documents d ON d.document_id = qs.document_id
                INNER JOIN users asker ON asker.user_id = qs.asker_user_id
                INNER JOIN users owner ON owner.user_id = qs.owner_user_id
                WHERE qs.session_id = $1
                  AND ($2::INT IS NULL OR qs.asker_user_id = $2 OR qs.owner_user_id = $2)
                LIMIT 1;
            `,
            [sessionId, userId]
        );

        return result.rows[0] || null;
    }

    const result = await pool
        .request()
        .input('sessionId', sql.Int, sessionId)
        .input('userId', sql.Int, userId)
        .query(`
            SELECT
                qs.sessionId,
                qs.documentId,
                d.title AS documentTitle,
                qs.askerUserId,
                asker.name AS askerName,
                qs.ownerUserId,
                owner.name AS ownerName,
                qs.status,
                qs.createdAt,
                qs.updatedAt,
                qs.closedAt,
                CAST(
                    CASE
                        WHEN EXISTS (
                            SELECT 1
                            FROM dbo.SessionRatings sr
                            WHERE sr.sessionId = qs.sessionId
                              AND sr.askerUserId = @userId
                        ) THEN 1
                        ELSE 0
                    END AS BIT
                ) AS hasRatedByCurrentUser
            FROM dbo.QuestionSessions qs
            INNER JOIN dbo.Documents d ON d.documentId = qs.documentId
            INNER JOIN dbo.Users asker ON asker.userId = qs.askerUserId
            INNER JOIN dbo.Users owner ON owner.userId = qs.ownerUserId
            WHERE qs.sessionId = @sessionId
              AND (@userId IS NULL OR qs.askerUserId = @userId OR qs.ownerUserId = @userId);
        `);

    return result.recordset[0] || null;
};

const createSession = async ({ documentId, askerUserId, initialMessage = null }) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const documentResult = await client.query(
                `
                    SELECT
                        d.document_id AS "documentId",
                        d.title,
                        d.owner_user_id AS "ownerUserId",
                        d.status
                    FROM documents d
                    WHERE d.document_id = $1
                    LIMIT 1;
                `,
                [documentId]
            );

            const document = documentResult.rows[0];
            if (!document) {
                const error = new Error('Document not found.');
                error.statusCode = 404;
                throw error;
            }

            if (Number(document.ownerUserId) === Number(askerUserId)) {
                const error = new Error('You cannot create a Q&A session for your own document.');
                error.statusCode = 400;
                throw error;
            }

            const createResult = await client.query(
                `
                    INSERT INTO question_sessions (document_id, asker_user_id, owner_user_id, status)
                    VALUES ($1, $2, $3, 'open')
                    RETURNING session_id AS "sessionId";
                `,
                [documentId, askerUserId, document.ownerUserId]
            );

            const sessionId = createResult.rows[0].sessionId;
            if (initialMessage && String(initialMessage).trim()) {
                await client.query(
                    `
                        INSERT INTO question_messages (session_id, sender_user_id, message)
                        VALUES ($1, $2, $3);
                    `,
                    [sessionId, askerUserId, String(initialMessage).trim()]
                );
            }

            await client.query('COMMIT');
            return getSessionByIdForUser({ sessionId, userId: askerUserId });
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
        const documentRequest = new sql.Request(transaction);
        documentRequest.input('documentId', sql.Int, documentId);

        const documentResult = await documentRequest.query(`
            SELECT TOP 1
                d.documentId,
                d.title,
                d.ownerUserId,
                d.status
            FROM dbo.Documents d
            WHERE d.documentId = @documentId;
        `);

        const document = documentResult.recordset[0];
        if (!document) {
            const error = new Error('Document not found.');
            error.statusCode = 404;
            throw error;
        }

        if (document.ownerUserId === askerUserId) {
            const error = new Error('You cannot create a Q&A session for your own document.');
            error.statusCode = 400;
            throw error;
        }

        const createRequest = new sql.Request(transaction);
        createRequest.input('documentId', sql.Int, documentId);
        createRequest.input('askerUserId', sql.Int, askerUserId);
        createRequest.input('ownerUserId', sql.Int, document.ownerUserId);

        const createResult = await createRequest.query(`
            INSERT INTO dbo.QuestionSessions (documentId, askerUserId, ownerUserId, status)
            VALUES (@documentId, @askerUserId, @ownerUserId, N'open');

            SELECT CAST(SCOPE_IDENTITY() AS INT) AS sessionId;
        `);

        const sessionId = createResult.recordset[0].sessionId;

        if (initialMessage && String(initialMessage).trim()) {
            const msgRequest = new sql.Request(transaction);
            msgRequest.input('sessionId', sql.Int, sessionId);
            msgRequest.input('senderUserId', sql.Int, askerUserId);
            msgRequest.input('message', sql.NVarChar(sql.MAX), String(initialMessage).trim());

            await msgRequest.query(`
                INSERT INTO dbo.QuestionMessages (sessionId, senderUserId, message)
                VALUES (@sessionId, @senderUserId, @message);
            `);
        }

        await transaction.commit();
        return getSessionByIdForUser({ sessionId, userId: askerUserId });
    } catch (error) {
        if (transaction._aborted !== true) {
            await transaction.rollback();
        }
        throw error;
    }
};

const getMySessions = async ({ userId, status = null }) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    qs.session_id AS "sessionId",
                    qs.document_id AS "documentId",
                    d.title AS "documentTitle",
                    qs.asker_user_id AS "askerUserId",
                    asker.name AS "askerName",
                    qs.owner_user_id AS "ownerUserId",
                    owner.name AS "ownerName",
                    qs.status,
                    qs.created_at AS "createdAt",
                    qs.updated_at AS "updatedAt",
                    qs.closed_at AS "closedAt",
                    last_msg.message AS "latestMessage",
                    last_msg.created_at AS "latestMessageAt",
                    COALESCE(msg_stats.total_messages, 0) AS "totalMessages",
                    EXISTS (
                        SELECT 1
                        FROM session_ratings sr
                        WHERE sr.session_id = qs.session_id
                          AND sr.asker_user_id = $1
                    ) AS "hasRatedByCurrentUser"
                FROM question_sessions qs
                INNER JOIN documents d ON d.document_id = qs.document_id
                INNER JOIN users asker ON asker.user_id = qs.asker_user_id
                INNER JOIN users owner ON owner.user_id = qs.owner_user_id
                LEFT JOIN LATERAL (
                    SELECT qm.message, qm.created_at
                    FROM question_messages qm
                    WHERE qm.session_id = qs.session_id
                    ORDER BY qm.created_at DESC, qm.message_id DESC
                    LIMIT 1
                ) last_msg ON TRUE
                LEFT JOIN LATERAL (
                    SELECT COUNT(1)::INT AS total_messages
                    FROM question_messages qm
                    WHERE qm.session_id = qs.session_id
                ) msg_stats ON TRUE
                WHERE (qs.asker_user_id = $1 OR qs.owner_user_id = $1)
                  AND ($2::TEXT IS NULL OR qs.status = $2)
                ORDER BY qs.created_at DESC, qs.session_id DESC;
            `,
            [userId, status]
        );

        return result.rows;
    }

    const result = await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('status', sql.NVarChar(20), status)
        .query(`
            SELECT
                qs.sessionId,
                qs.documentId,
                d.title AS documentTitle,
                qs.askerUserId,
                asker.name AS askerName,
                qs.ownerUserId,
                owner.name AS ownerName,
                qs.status,
                qs.createdAt,
                qs.updatedAt,
                qs.closedAt,
                lastMsg.message AS latestMessage,
                lastMsg.createdAt AS latestMessageAt,
                ISNULL(msgStats.totalMessages, 0) AS totalMessages,
                CAST(
                    CASE
                        WHEN EXISTS (
                            SELECT 1
                            FROM dbo.SessionRatings sr
                            WHERE sr.sessionId = qs.sessionId
                              AND sr.askerUserId = @userId
                        ) THEN 1
                        ELSE 0
                    END AS BIT
                ) AS hasRatedByCurrentUser
            FROM dbo.QuestionSessions qs
            INNER JOIN dbo.Documents d ON d.documentId = qs.documentId
            INNER JOIN dbo.Users asker ON asker.userId = qs.askerUserId
            INNER JOIN dbo.Users owner ON owner.userId = qs.ownerUserId
            OUTER APPLY (
                SELECT TOP 1 qm.message, qm.createdAt
                FROM dbo.QuestionMessages qm
                WHERE qm.sessionId = qs.sessionId
                ORDER BY qm.createdAt DESC, qm.messageId DESC
            ) lastMsg
            OUTER APPLY (
                SELECT COUNT(*) AS totalMessages
                FROM dbo.QuestionMessages qm
                WHERE qm.sessionId = qs.sessionId
            ) msgStats
            WHERE (qs.askerUserId = @userId OR qs.ownerUserId = @userId)
              AND (@status IS NULL OR qs.status = @status)
            ORDER BY qs.createdAt DESC, qs.sessionId DESC;
        `);

    return result.recordset;
};

const getSessionMessages = async ({ sessionId, userId }) => {
    const pool = getPool();
    const accessCheck = await getSessionByIdForUser({ sessionId, userId });

    if (!accessCheck) {
        const error = new Error('Q&A session not found or no permission.');
        error.statusCode = 404;
        throw error;
    }

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    qm.message_id AS "messageId",
                    qm.session_id AS "sessionId",
                    qm.sender_user_id AS "senderUserId",
                    u.name AS "senderName",
                    qm.message,
                    qm.created_at AS "createdAt"
                FROM question_messages qm
                INNER JOIN users u ON u.user_id = qm.sender_user_id
                WHERE qm.session_id = $1
                ORDER BY qm.created_at ASC, qm.message_id ASC;
            `,
            [sessionId]
        );

        return {
            session: accessCheck,
            messages: result.rows,
        };
    }

    const result = await pool
        .request()
        .input('sessionId', sql.Int, sessionId)
        .query(`
            SELECT
                qm.messageId,
                qm.sessionId,
                qm.senderUserId,
                u.name AS senderName,
                qm.message,
                qm.createdAt
            FROM dbo.QuestionMessages qm
            INNER JOIN dbo.Users u ON u.userId = qm.senderUserId
            WHERE qm.sessionId = @sessionId
            ORDER BY qm.createdAt ASC, qm.messageId ASC;
        `);

    return {
        session: accessCheck,
        messages: result.recordset,
    };
};

const addSessionMessage = async ({ sessionId, senderUserId, message }) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const sessionResult = await client.query(
                `
                    SELECT
                        qs.session_id AS "sessionId",
                        qs.asker_user_id AS "askerUserId",
                        qs.owner_user_id AS "ownerUserId",
                        qs.status
                    FROM question_sessions qs
                    WHERE qs.session_id = $1
                      AND (qs.asker_user_id = $2 OR qs.owner_user_id = $2)
                    FOR UPDATE;
                `,
                [sessionId, senderUserId]
            );

            const session = sessionResult.rows[0];
            if (!session) {
                const error = new Error('Q&A session not found or no permission.');
                error.statusCode = 404;
                throw error;
            }

            if (session.status !== 'open') {
                const error = new Error('Cannot send message because this Q&A session is already closed.');
                error.statusCode = 400;
                throw error;
            }

            const messageResult = await client.query(
                `
                    INSERT INTO question_messages (session_id, sender_user_id, message)
                    VALUES ($1, $2, $3)
                    RETURNING
                        message_id AS "messageId",
                        session_id AS "sessionId",
                        sender_user_id AS "senderUserId",
                        message,
                        created_at AS "createdAt";
                `,
                [sessionId, senderUserId, message]
            );

            await client.query(
                `
                    UPDATE question_sessions
                    SET updated_at = NOW()
                    WHERE session_id = $1;
                `,
                [sessionId]
            );

            await client.query('COMMIT');
            return {
                session,
                message: messageResult.rows[0],
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
        const sessionRequest = new sql.Request(transaction);
        sessionRequest.input('sessionId', sql.Int, sessionId);
        sessionRequest.input('senderUserId', sql.Int, senderUserId);

        const sessionResult = await sessionRequest.query(`
            SELECT TOP 1
                qs.sessionId,
                qs.askerUserId,
                qs.ownerUserId,
                qs.status
            FROM dbo.QuestionSessions qs WITH (UPDLOCK, ROWLOCK)
            WHERE qs.sessionId = @sessionId
              AND (qs.askerUserId = @senderUserId OR qs.ownerUserId = @senderUserId);
        `);

        const session = sessionResult.recordset[0];

        if (!session) {
            const error = new Error('Q&A session not found or no permission.');
            error.statusCode = 404;
            throw error;
        }

        if (session.status !== 'open') {
            const error = new Error('Cannot send message because this Q&A session is already closed.');
            error.statusCode = 400;
            throw error;
        }

        const messageRequest = new sql.Request(transaction);
        messageRequest.input('sessionId', sql.Int, sessionId);
        messageRequest.input('senderUserId', sql.Int, senderUserId);
        messageRequest.input('message', sql.NVarChar(sql.MAX), message);

        const messageResult = await messageRequest.query(`
            INSERT INTO dbo.QuestionMessages (sessionId, senderUserId, message)
            VALUES (@sessionId, @senderUserId, @message);

            UPDATE dbo.QuestionSessions
            SET updatedAt = SYSDATETIME()
            WHERE sessionId = @sessionId;

            SELECT TOP 1
                qm.messageId,
                qm.sessionId,
                qm.senderUserId,
                qm.message,
                qm.createdAt
            FROM dbo.QuestionMessages qm
            WHERE qm.sessionId = @sessionId
            ORDER BY qm.messageId DESC;
        `);

        await transaction.commit();

        return {
            session,
            message: messageResult.recordset[0],
        };
    } catch (error) {
        if (transaction._aborted !== true) {
            await transaction.rollback();
        }
        throw error;
    }
};

const closeSession = async ({ sessionId, closedByUserId }) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                UPDATE question_sessions
                SET
                    status = 'closed',
                    closed_at = COALESCE(closed_at, NOW()),
                    updated_at = NOW()
                WHERE session_id = $1
                  AND status = 'open'
                  AND (asker_user_id = $2 OR owner_user_id = $2)
                RETURNING session_id;
            `,
            [sessionId, closedByUserId]
        );

        const affectedRows = result.rowCount || 0;

        if (!affectedRows) {
            const existing = await getSessionByIdForUser({ sessionId, userId: closedByUserId });

            if (!existing) {
                const error = new Error('Q&A session not found or no permission.');
                error.statusCode = 404;
                throw error;
            }

            if (existing.status !== 'open') {
                const error = new Error('Q&A session is already closed.');
                error.statusCode = 400;
                throw error;
            }
        }

        return getSessionByIdForUser({ sessionId, userId: closedByUserId });
    }

    const result = await pool
        .request()
        .input('sessionId', sql.Int, sessionId)
        .input('closedByUserId', sql.Int, closedByUserId)
        .query(`
            UPDATE dbo.QuestionSessions
            SET
                status = N'closed',
                closedAt = COALESCE(closedAt, SYSDATETIME()),
                updatedAt = SYSDATETIME()
            WHERE sessionId = @sessionId
              AND status = N'open'
              AND (askerUserId = @closedByUserId OR ownerUserId = @closedByUserId);

            SELECT @@ROWCOUNT AS affectedRows;
        `);

    const affectedRows = result.recordset[0]?.affectedRows || 0;

    if (!affectedRows) {
        const existing = await getSessionByIdForUser({ sessionId, userId: closedByUserId });

        if (!existing) {
            const error = new Error('Q&A session not found or no permission.');
            error.statusCode = 404;
            throw error;
        }

        if (existing.status !== 'open') {
            const error = new Error('Q&A session is already closed.');
            error.statusCode = 400;
            throw error;
        }
    }

    return getSessionByIdForUser({ sessionId, userId: closedByUserId });
};

const rateSession = async ({ sessionId, askerUserId, stars, feedback = null }) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const sessionResult = await client.query(
                `
                    SELECT
                        qs.session_id AS "sessionId",
                        qs.document_id AS "documentId",
                        qs.asker_user_id AS "askerUserId",
                        qs.owner_user_id AS "ownerUserId",
                        qs.status
                    FROM question_sessions qs
                    WHERE qs.session_id = $1
                      AND qs.asker_user_id = $2
                    FOR UPDATE;
                `,
                [sessionId, askerUserId]
            );

            const session = sessionResult.rows[0];
            if (!session) {
                const error = new Error('Q&A session not found or no permission to rate.');
                error.statusCode = 404;
                throw error;
            }

            if (session.status !== 'closed') {
                const error = new Error('Q&A session must be closed before rating.');
                error.statusCode = 400;
                throw error;
            }

            const duplicateResult = await client.query(
                `
                    SELECT rating_id AS "ratingId"
                    FROM session_ratings
                    WHERE session_id = $1
                      AND asker_user_id = $2
                    LIMIT 1;
                `,
                [sessionId, askerUserId]
            );

            if (duplicateResult.rows[0]) {
                const error = new Error('You already rated this Q&A session.');
                error.statusCode = 400;
                throw error;
            }

            const ratingResult = await client.query(
                `
                    INSERT INTO session_ratings (session_id, asker_user_id, owner_user_id, stars, feedback)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING rating_id AS "ratingId";
                `,
                [sessionId, askerUserId, session.ownerUserId, stars, feedback]
            );

            await client.query('COMMIT');

            return {
                ratingId: ratingResult.rows[0].ratingId,
                ...session,
                stars,
                feedback,
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
        const sessionRequest = new sql.Request(transaction);
        sessionRequest.input('sessionId', sql.Int, sessionId);
        sessionRequest.input('askerUserId', sql.Int, askerUserId);

        const sessionResult = await sessionRequest.query(`
            SELECT TOP 1
                qs.sessionId,
                qs.documentId,
                qs.askerUserId,
                qs.ownerUserId,
                qs.status
            FROM dbo.QuestionSessions qs WITH (UPDLOCK, ROWLOCK)
            WHERE qs.sessionId = @sessionId
              AND qs.askerUserId = @askerUserId;
        `);

        const session = sessionResult.recordset[0];

        if (!session) {
            const error = new Error('Q&A session not found or no permission to rate.');
            error.statusCode = 404;
            throw error;
        }

        if (session.status !== 'closed') {
            const error = new Error('Q&A session must be closed before rating.');
            error.statusCode = 400;
            throw error;
        }

        const duplicateRequest = new sql.Request(transaction);
        duplicateRequest.input('sessionId', sql.Int, sessionId);
        duplicateRequest.input('askerUserId', sql.Int, askerUserId);

        const duplicateResult = await duplicateRequest.query(`
            SELECT TOP 1 ratingId
            FROM dbo.SessionRatings
            WHERE sessionId = @sessionId
              AND askerUserId = @askerUserId;
        `);

        if (duplicateResult.recordset[0]) {
            const error = new Error('You already rated this Q&A session.');
            error.statusCode = 400;
            throw error;
        }

        const ratingRequest = new sql.Request(transaction);
        ratingRequest.input('sessionId', sql.Int, sessionId);
        ratingRequest.input('askerUserId', sql.Int, askerUserId);
        ratingRequest.input('ownerUserId', sql.Int, session.ownerUserId);
        ratingRequest.input('stars', sql.TinyInt, stars);
        ratingRequest.input('feedback', sql.NVarChar(500), feedback);

        const ratingResult = await ratingRequest.query(`
            INSERT INTO dbo.SessionRatings (sessionId, askerUserId, ownerUserId, stars, feedback)
            VALUES (@sessionId, @askerUserId, @ownerUserId, @stars, @feedback);

            SELECT CAST(SCOPE_IDENTITY() AS INT) AS ratingId;
        `);

        await transaction.commit();

        return {
            ratingId: ratingResult.recordset[0].ratingId,
            ...session,
            stars,
            feedback,
        };
    } catch (error) {
        if (transaction._aborted !== true) {
            await transaction.rollback();
        }
        throw error;
    }
};

module.exports = {
    createSession,
    getMySessions,
    getSessionMessages,
    addSessionMessage,
    closeSession,
    rateSession,
    getSessionByIdForUser,
};
