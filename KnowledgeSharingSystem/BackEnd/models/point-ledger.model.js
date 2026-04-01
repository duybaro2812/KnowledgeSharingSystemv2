const { getPool, sql } = require('../utils/db');

const getMyPointSummary = async (userId) => {
    const pool = getPool();
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
            pe.qaSessionId,
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

const getPointPolicy = () => ({
    unlock: {
        previewThreshold: 30,
        fullViewThreshold: 40,
        fullViewDailyLimitFor40To199: 3,
    },
    download: {
        standardCost: 30,
        priorityThreshold: 200,
        priorityCost: 15,
    },
    note: 'Point events are applied after moderator/admin review based on platform policy.',
});

module.exports = {
    getMyPointSummary,
    getMyPointTransactions,
    getMyPointEvents,
    getPointPolicy,
};

