const { getPool, sql, isPostgresClient } = require('../utils/db');
const { buildPointPolicyResponse } = require('../config/point-policy');

const getMyPointSummary = async (userId) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    u.user_id AS "userId",
                    u.username,
                    u.name,
                    u.points AS "currentPoints",
                    COALESCE(tx.total_earned, 0)::INT AS "totalEarned",
                    COALESCE(tx.total_spent, 0)::INT AS "totalSpent",
                    COALESCE(ev.pending_events, 0)::INT AS "pendingEvents",
                    COALESCE(ev.approved_events, 0)::INT AS "approvedEvents",
                    COALESCE(ev.rejected_events, 0)::INT AS "rejectedEvents"
                FROM users u
                LEFT JOIN LATERAL (
                    SELECT
                        SUM(CASE WHEN pt.points > 0 THEN pt.points ELSE 0 END) AS total_earned,
                        SUM(CASE WHEN pt.points < 0 THEN ABS(pt.points) ELSE 0 END) AS total_spent
                    FROM point_transactions pt
                    WHERE pt.user_id = u.user_id
                ) tx ON TRUE
                LEFT JOIN LATERAL (
                    SELECT
                        SUM(CASE WHEN pe.status = 'pending' THEN 1 ELSE 0 END) AS pending_events,
                        SUM(CASE WHEN pe.status = 'approved' THEN 1 ELSE 0 END) AS approved_events,
                        SUM(CASE WHEN pe.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_events
                    FROM point_events pe
                    WHERE pe.user_id = u.user_id
                ) ev ON TRUE
                WHERE u.user_id = $1;
            `,
            [userId]
        );
        return result.rows[0] || null;
    }

    const request = pool.request();
    request.input('userId', sql.Int, userId);

    const result = await request.query(`
        SELECT
            u.userId,
            u.username,
            u.name,
            u.points AS currentPoints,
            ISNULL(tx.totalEarned, 0) AS totalEarned,
            ISNULL(tx.totalSpent, 0) AS totalSpent,
            ISNULL(ev.pendingEvents, 0) AS pendingEvents,
            ISNULL(ev.approvedEvents, 0) AS approvedEvents,
            ISNULL(ev.rejectedEvents, 0) AS rejectedEvents
        FROM dbo.Users u
        OUTER APPLY (
            SELECT
                SUM(CASE WHEN pt.points > 0 THEN pt.points ELSE 0 END) AS totalEarned,
                SUM(CASE WHEN pt.points < 0 THEN ABS(pt.points) ELSE 0 END) AS totalSpent
            FROM dbo.PointTransactions pt
            WHERE pt.userId = u.userId
        ) tx
        OUTER APPLY (
            SELECT
                SUM(CASE WHEN pe.status = N'pending' THEN 1 ELSE 0 END) AS pendingEvents,
                SUM(CASE WHEN pe.status = N'approved' THEN 1 ELSE 0 END) AS approvedEvents,
                SUM(CASE WHEN pe.status = N'rejected' THEN 1 ELSE 0 END) AS rejectedEvents
            FROM dbo.PointEvents pe
            WHERE pe.userId = u.userId
        ) ev
        WHERE u.userId = @userId;
    `);

    return result.recordset[0] || null;
};

const getMyPointTransactions = async ({ userId, limit = 50 }) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    pt.transaction_id AS "transactionId",
                    pt.user_id AS "userId",
                    pt.transaction_type AS "transactionType",
                    pt.points,
                    pt.description,
                    pt.document_id AS "documentId",
                    d.title AS "documentTitle",
                    pt.answer_id AS "answerId",
                    pt.review_id AS "reviewId",
                    pt.created_at AS "createdAt"
                FROM point_transactions pt
                LEFT JOIN documents d ON d.document_id = pt.document_id
                WHERE pt.user_id = $1
                ORDER BY pt.transaction_id DESC
                LIMIT $2;
            `,
            [userId, limit]
        );
        return result.rows;
    }

    const request = pool.request();
    request.input('userId', sql.Int, userId);
    request.input('limit', sql.Int, limit);

    const result = await request.query(`
        SELECT TOP (@limit)
            pt.transactionId,
            pt.userId,
            pt.transactionType,
            pt.points,
            pt.description,
            pt.documentId,
            d.title AS documentTitle,
            pt.answerId,
            pt.reviewId,
            pt.createdAt
        FROM dbo.PointTransactions pt
        LEFT JOIN dbo.Documents d ON d.documentId = pt.documentId
        WHERE pt.userId = @userId
        ORDER BY pt.transactionId DESC;
    `);

    return result.recordset;
};

const getMyPointEvents = async ({ userId, status = null, limit = 50 }) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    pe.event_id AS "eventId",
                    pe.user_id AS "userId",
                    pe.event_type AS "eventType",
                    pe.points,
                    pe.status,
                    pe.document_id AS "documentId",
                    d.title AS "documentTitle",
                    pe.comment_id AS "commentId",
                    pe.qa_session_id AS "qaSessionId",
                    pe.source_user_id AS "sourceUserId",
                    pe.metadata,
                    pe.created_at AS "createdAt",
                    pe.reviewed_by_user_id AS "reviewedByUserId",
                    rv.name AS "reviewedByName",
                    pe.review_note AS "reviewNote",
                    pe.reviewed_at AS "reviewedAt"
                FROM point_events pe
                LEFT JOIN documents d ON d.document_id = pe.document_id
                LEFT JOIN users rv ON rv.user_id = pe.reviewed_by_user_id
                WHERE pe.user_id = $1
                  AND ($2::TEXT IS NULL OR pe.status = $2)
                ORDER BY pe.event_id DESC
                LIMIT $3;
            `,
            [userId, status, limit]
        );
        return result.rows;
    }

    const request = pool.request();
    request.input('userId', sql.Int, userId);
    request.input('status', sql.NVarChar(20), status);
    request.input('limit', sql.Int, limit);

    const result = await request.query(`
        SELECT TOP (@limit)
            pe.eventId,
            pe.userId,
            pe.eventType,
            pe.points,
            pe.status,
            pe.documentId,
            d.title AS documentTitle,
            pe.commentId,
            pe.qaSessionId,
            pe.sourceUserId,
            pe.metadata,
            pe.createdAt,
            pe.reviewedByUserId,
            rv.name AS reviewedByName,
            pe.reviewNote,
            pe.reviewedAt
        FROM dbo.PointEvents pe
        LEFT JOIN dbo.Documents d ON d.documentId = pe.documentId
        LEFT JOIN dbo.Users rv ON rv.userId = pe.reviewedByUserId
        WHERE pe.userId = @userId
          AND (@status IS NULL OR pe.status = @status)
        ORDER BY pe.eventId DESC;
    `);

    return result.recordset;
};

const getPointPolicy = () => buildPointPolicyResponse();

module.exports = {
    getMyPointSummary,
    getMyPointTransactions,
    getMyPointEvents,
    getPointPolicy,
};
