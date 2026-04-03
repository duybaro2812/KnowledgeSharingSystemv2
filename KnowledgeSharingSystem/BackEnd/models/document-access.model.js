const { getPool, sql } = require('../utils/db');
const { POINT_POLICY } = require('../config/point-policy');

const getDocumentForAccess = async (documentId) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .query(`
            SELECT
                d.documentId,
                d.ownerUserId,
                d.title,
                d.fileUrl,
                d.originalFileName,
                d.status
            FROM dbo.Documents d
            WHERE d.documentId = @documentId;
        `);

    return result.recordset[0] || null;
};

const getUserPoints = async (userId) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('userId', sql.Int, userId)
        .query(`
            SELECT points
            FROM dbo.Users
            WHERE userId = @userId;
        `);

    return Number(result.recordset[0]?.points || 0);
};

const getTodayFullViewCount = async (userId) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('viewerUserId', sql.Int, userId)
        .query(`
            SELECT COUNT(1) AS total
            FROM dbo.DocumentAccessLogs
            WHERE viewerUserId = @viewerUserId
              AND accessType = N'full_view'
              AND accessDate = CAST(SYSDATETIME() AS DATE);
        `);

    return Number(result.recordset[0]?.total || 0);
};

const createAccessLog = async ({ documentId, viewerUserId, accessType, pointsCost = 0 }) => {
    const pool = getPool();

    await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .input('viewerUserId', sql.Int, viewerUserId)
        .input('accessType', sql.NVarChar(20), accessType)
        .input('pointsCost', sql.Int, pointsCost)
        .query(`
            INSERT INTO dbo.DocumentAccessLogs (
                documentId,
                viewerUserId,
                accessType,
                pointsCost
            )
            VALUES (
                @documentId,
                @viewerUserId,
                @accessType,
                @pointsCost
            );
        `);
};

const chargeDownloadPoints = async ({
    userId,
    documentId,
    pointsCost,
    description,
}) => {
    const pool = getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
        const lockRequest = new sql.Request(transaction);
        lockRequest.input('userId', sql.Int, userId);

        const userResult = await lockRequest.query(`
            SELECT points
            FROM dbo.Users WITH (UPDLOCK, ROWLOCK)
            WHERE userId = @userId;
        `);

        const currentPoints = Number(userResult.recordset[0]?.points || 0);

        if (currentPoints < pointsCost) {
            const error = new Error('Insufficient points for download.');
            error.statusCode = 403;
            throw error;
        }

        const updateRequest = new sql.Request(transaction);
        updateRequest.input('userId', sql.Int, userId);
        updateRequest.input('pointsCost', sql.Int, pointsCost);
        updateRequest.input('documentId', sql.Int, documentId);
        updateRequest.input('description', sql.NVarChar(255), description);

        const updateResult = await updateRequest.query(`
            UPDATE dbo.Users
            SET
                points = points - @pointsCost,
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
                N'download_cost',
                -@pointsCost,
                @description,
                @documentId,
                NULL,
                NULL
            );

            SELECT points AS remainingPoints
            FROM dbo.Users
            WHERE userId = @userId;
        `);

        await transaction.commit();

        return Number(updateResult.recordset[0]?.remainingPoints || 0);
    } catch (error) {
        if (transaction._aborted !== true) {
            await transaction.rollback();
        }
        throw error;
    }
};

const buildAccessPolicy = async ({ userId, role, document }) => {
    if (!document) {
        const error = new Error('Document not found.');
        error.statusCode = 404;
        throw error;
    }

    if (document.status !== 'approved') {
        const error = new Error('Only approved documents can be accessed.');
        error.statusCode = 400;
        throw error;
    }

    const isPrivileged = role === 'admin' || role === 'moderator';
    const isOwner = Number(document.ownerUserId) === Number(userId);

    if (isPrivileged || isOwner) {
        return {
            points: await getUserPoints(userId),
            canPreview: true,
            canFullView: true,
            canDownload: true,
            dailyViewLimit: null,
            todayFullViewCount: 0,
            viewsRemainingToday: null,
            downloadCost: 0,
            tier: 'privileged',
            reason: 'Owner/admin/moderator bypass',
        };
    }

    const points = await getUserPoints(userId);
    const todayFullViewCount = await getTodayFullViewCount(userId);

    if (points < POINT_POLICY.unlock.previewThreshold) {
        return {
            points,
            canPreview: true,
            canFullView: false,
            canDownload: false,
            dailyViewLimit: 0,
            todayFullViewCount,
            viewsRemainingToday: 0,
            downloadCost: null,
            tier: 'preview_only',
            reason: `Need at least ${POINT_POLICY.unlock.previewThreshold} points to unlock full view.`,
        };
    }

    if (points < POINT_POLICY.unlock.fullViewThreshold) {
        const viewLimit = POINT_POLICY.unlock.fullViewDailyLimitFor30To39;
        const viewsRemainingToday = Math.max(0, viewLimit - todayFullViewCount);

        return {
            points,
            canPreview: true,
            canFullView: viewsRemainingToday > 0,
            canDownload: false,
            dailyViewLimit: viewLimit,
            todayFullViewCount,
            viewsRemainingToday,
            downloadCost: null,
            tier: 'view_limited',
            reason:
                viewsRemainingToday > 0
                    ? null
                    : `Daily full-view limit reached (${viewLimit}).`,
        };
    }

    const downloadCost =
        points >= POINT_POLICY.download.priorityThreshold
            ? POINT_POLICY.download.priorityCost
            : POINT_POLICY.download.standardCost;

    return {
        points,
        canPreview: true,
        canFullView: true,
        canDownload: points >= downloadCost,
        dailyViewLimit: null,
        todayFullViewCount,
        viewsRemainingToday: null,
        downloadCost,
        tier: points >= POINT_POLICY.download.priorityThreshold ? 'priority' : 'standard',
        reason: points >= downloadCost ? null : 'Insufficient points for download.',
    };
};

module.exports = {
    getDocumentForAccess,
    getUserPoints,
    getTodayFullViewCount,
    createAccessLog,
    chargeDownloadPoints,
    buildAccessPolicy,
};
