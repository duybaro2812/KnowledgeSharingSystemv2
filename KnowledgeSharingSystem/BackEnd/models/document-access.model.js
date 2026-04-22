const { getPool, sql, isPostgresClient } = require('../utils/db');
const { POINT_POLICY } = require('../config/point-policy');

const buildDownloadConfirmation = ({ title, downloadCost, points }) => {
    if (!downloadCost || downloadCost <= 0) {
        return null;
    }

    return {
        title: 'Xác nhận tải tài liệu',
        message: `Xác nhận mất ${downloadCost} điểm để download tài liệu "${title}"?`,
        pointsBefore: points,
        pointsCost: downloadCost,
        pointsAfterIfConfirmed: Math.max(0, Number(points || 0) - Number(downloadCost || 0)),
    };
};

const buildLockedPreviewOverlay = ({ points, requiredPoints }) => ({
    title: 'This document is locked',
    message: `You need at least ${requiredPoints} points to unlock this document.`,
    helperText: 'Earn more points to view, comment, discuss, and ask questions about this document.',
    currentPoints: points,
    requiredPoints,
    shortfallPoints: Math.max(0, Number(requiredPoints || 0) - Number(points || 0)),
});

const getDocumentForAccess = async (documentId) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    d.document_id AS "documentId",
                    d.owner_user_id AS "ownerUserId",
                    d.title,
                    d.file_url AS "fileUrl",
                    d.original_file_name AS "originalFileName",
                    d.mime_type AS "mimeType",
                    d.status
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
                d.ownerUserId,
                d.title,
                d.fileUrl,
                d.originalFileName,
                d.mimeType,
                d.status
            FROM dbo.Documents d
            WHERE d.documentId = @documentId;
        `);

    return result.recordset[0] || null;
};

const getUserPoints = async (userId) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT points
                FROM users
                WHERE user_id = $1;
            `,
            [userId]
        );
        return Number(result.rows[0]?.points || 0);
    }

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT COUNT(1)::INT AS total
                FROM document_access_logs
                WHERE viewer_user_id = $1
                  AND access_type = 'full_view'
                  AND access_date = CURRENT_DATE;
            `,
            [userId]
        );

        return Number(result.rows[0]?.total || 0);
    }

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

    if (isPostgresClient()) {
        await pool.query(
            `
                INSERT INTO document_access_logs (
                    document_id,
                    viewer_user_id,
                    access_type,
                    points_cost
                )
                VALUES ($1, $2, $3, $4);
            `,
            [documentId, viewerUserId, accessType, pointsCost]
        );
        return;
    }

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

    if (isPostgresClient()) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const userResult = await client.query(
                `
                    SELECT points
                    FROM users
                    WHERE user_id = $1
                    FOR UPDATE;
                `,
                [userId]
            );
            const currentPoints = Number(userResult.rows[0]?.points || 0);

            if (currentPoints < pointsCost) {
                const error = new Error('Insufficient points for download.');
                error.statusCode = 403;
                throw error;
            }

            const updateResult = await client.query(
                `
                    UPDATE users
                    SET
                        points = points - $2,
                        updated_at = NOW()
                    WHERE user_id = $1
                    RETURNING points AS "remainingPoints";
                `,
                [userId, pointsCost]
            );

            await client.query(
                `
                    INSERT INTO point_transactions (
                        user_id,
                        transaction_type,
                        points,
                        description,
                        document_id,
                        answer_id,
                        review_id
                    )
                    VALUES ($1, 'download_cost', $2, $3, $4, NULL, NULL);
                `,
                [userId, -pointsCost, description, documentId]
            );

            await client.query('COMMIT');
            return Number(updateResult.rows[0]?.remainingPoints || 0);
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
            accessState: 'privileged',
            isLocked: false,
            canPreview: true,
            canFullView: true,
            canDownload: true,
            canComment: true,
            canDiscuss: true,
            canAskQuestion: true,
            dailyViewLimit: null,
            todayFullViewCount: 0,
            viewsRemainingToday: null,
            previewPageLimit: null,
            downloadCost: 0,
            downloadConfirmation: null,
            lockedOverlay: null,
            tier: 'privileged',
            reason: 'Owner/admin/moderator bypass',
        };
    }

    const points = await getUserPoints(userId);
    const todayFullViewCount = await getTodayFullViewCount(userId);

    if (points < POINT_POLICY.unlock.previewThreshold) {
        return {
            points,
            accessState: 'locked_points',
            isLocked: true,
            canPreview: true,
            canFullView: false,
            canDownload: false,
            canComment: true,
            canDiscuss: true,
            canAskQuestion: true,
            dailyViewLimit: 0,
            todayFullViewCount,
            viewsRemainingToday: 0,
            previewPageLimit: POINT_POLICY.unlock.previewPageLimitWhenLocked || 5,
            downloadCost: null,
            downloadConfirmation: null,
            lockedOverlay: buildLockedPreviewOverlay({
                points,
                requiredPoints: POINT_POLICY.unlock.previewThreshold,
            }),
            tier: 'locked',
            reason: `Need at least ${POINT_POLICY.unlock.previewThreshold} points to unlock this document.`,
        };
    }

    if (points < POINT_POLICY.unlock.fullViewThreshold) {
        const viewLimit = POINT_POLICY.unlock.fullViewDailyLimitFor30To39;
        const viewsRemainingToday = Math.max(0, viewLimit - todayFullViewCount);

        return {
            points,
            accessState: 'limited_full',
            isLocked: false,
            canPreview: true,
            canFullView: viewsRemainingToday > 0,
            canDownload: false,
            canComment: true,
            canDiscuss: true,
            canAskQuestion: true,
            dailyViewLimit: viewLimit,
            todayFullViewCount,
            viewsRemainingToday,
            previewPageLimit: null,
            downloadCost: null,
            downloadConfirmation: null,
            lockedOverlay: null,
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
        accessState: 'full_access',
        isLocked: false,
        canPreview: true,
        canFullView: true,
        canDownload: points >= downloadCost,
        canComment: true,
        canDiscuss: true,
        canAskQuestion: true,
        dailyViewLimit: null,
        todayFullViewCount,
        viewsRemainingToday: null,
        previewPageLimit: null,
        downloadCost,
        downloadConfirmation: buildDownloadConfirmation({
            title: document.title,
            downloadCost,
            points,
        }),
        lockedOverlay: null,
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
