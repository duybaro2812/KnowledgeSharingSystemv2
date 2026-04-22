const { getPool, sql, isPostgresClient } = require('../utils/db');

const REPORT_AUTO_LOCK_THRESHOLD = 5;

const createDocumentReport = async ({ documentId, reporterUserId, reason }) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const docResult = await client.query(
                `
                    SELECT owner_user_id AS "ownerUserId", status AS "currentStatus"
                    FROM documents
                    WHERE document_id = $1
                    FOR UPDATE;
                `,
                [documentId]
            );
            const doc = docResult.rows[0];
            if (!doc) {
                const error = new Error('Document not found.');
                error.statusCode = 404;
                throw error;
            }
            if (Number(doc.ownerUserId) === Number(reporterUserId)) {
                const error = new Error('You cannot report your own document.');
                error.statusCode = 400;
                throw error;
            }

            const duplicate = await client.query(
                `
                    SELECT 1 AS ok
                    FROM reports
                    WHERE document_id = $1
                      AND reporter_user_id = $2
                    LIMIT 1;
                `,
                [documentId, reporterUserId]
            );
            if (duplicate.rows[0]) {
                const error = new Error('You have already reported this document.');
                error.statusCode = 400;
                throw error;
            }

            const reportInsert = await client.query(
                `
                    INSERT INTO reports (reporter_user_id, document_id, reason, status)
                    VALUES ($1, $2, $3, 'pending')
                    RETURNING report_id AS "reportId";
                `,
                [reporterUserId, documentId, reason]
            );
            const reportId = Number(reportInsert.rows[0].reportId);

            const statResult = await client.query(
                `
                    SELECT COUNT(DISTINCT reporter_user_id)::INT AS "uniqueReporterCount"
                    FROM reports
                    WHERE document_id = $1
                      AND status IN ('pending', 'reviewed');
                `,
                [documentId]
            );
            const uniqueReporterCount = Number(statResult.rows[0]?.uniqueReporterCount || 0);

            let wasAutoLocked = false;
            if (uniqueReporterCount > REPORT_AUTO_LOCK_THRESHOLD && doc.currentStatus !== 'hidden') {
                await client.query(
                    `
                        UPDATE documents
                        SET
                            status = 'hidden',
                            updated_at = NOW()
                        WHERE document_id = $1;
                    `,
                    [documentId]
                );
                wasAutoLocked = true;
            }

            await client.query(
                `
                    INSERT INTO user_activity_logs (user_id, action, target_type, target_id)
                    VALUES ($1, 'create_report', 'report', $2);
                `,
                [reporterUserId, reportId]
            );

            await client.query('COMMIT');
            return {
                reportId,
                ownerUserId: Number(doc.ownerUserId),
                uniqueReporterCount,
                wasAutoLocked,
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
        .input('documentId', sql.Int, documentId)
        .input('reporterUserId', sql.Int, reporterUserId)
        .input('reason', sql.NVarChar(255), reason)
        .input('lockThreshold', sql.Int, REPORT_AUTO_LOCK_THRESHOLD)
        .query(`
            BEGIN TRY
                BEGIN TRANSACTION;

                DECLARE @ownerUserId INT;
                DECLARE @currentStatus NVARCHAR(20);

                SELECT
                    @ownerUserId = d.ownerUserId,
                    @currentStatus = d.status
                FROM dbo.Documents d
                WHERE d.documentId = @documentId;

                IF @ownerUserId IS NULL
                BEGIN
                    THROW 56701, N'Document not found.', 1;
                END;

                IF @ownerUserId = @reporterUserId
                BEGIN
                    THROW 56702, N'You cannot report your own document.', 1;
                END;

                IF EXISTS (
                    SELECT 1
                    FROM dbo.Reports r
                    WHERE r.documentId = @documentId
                      AND r.reporterUserId = @reporterUserId
                )
                BEGIN
                    THROW 56703, N'You have already reported this document.', 1;
                END;

                INSERT INTO dbo.Reports (
                    reporterUserId,
                    documentId,
                    reason,
                    status
                )
                VALUES (
                    @reporterUserId,
                    @documentId,
                    @reason,
                    N'pending'
                );

                DECLARE @reportId INT = CAST(SCOPE_IDENTITY() AS INT);
                DECLARE @uniqueReporterCount INT;
                DECLARE @wasAutoLocked BIT = 0;

                SELECT @uniqueReporterCount = COUNT(DISTINCT r.reporterUserId)
                FROM dbo.Reports r
                WHERE r.documentId = @documentId
                  AND r.status IN (N'pending', N'reviewed');

                IF @uniqueReporterCount > @lockThreshold AND @currentStatus <> N'hidden'
                BEGIN
                    UPDATE dbo.Documents
                    SET
                        status = N'hidden',
                        updatedAt = SYSDATETIME()
                    WHERE documentId = @documentId;

                    SET @wasAutoLocked = 1;
                END;

                INSERT INTO dbo.UserActivityLogs (userId, action, targetType, targetId)
                VALUES (@reporterUserId, N'create_report', N'report', @reportId);

                COMMIT TRANSACTION;

                SELECT
                    @reportId AS reportId,
                    @ownerUserId AS ownerUserId,
                    @uniqueReporterCount AS uniqueReporterCount,
                    @wasAutoLocked AS wasAutoLocked;
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0
                    ROLLBACK TRANSACTION;
                THROW;
            END CATCH;
        `);

    return result.recordset[0];
};

const getPendingDocumentReportQueue = async ({
    reportStatus = 'open',
    limit = 100,
    offset = 0,
} = {}) => {
    const pool = getPool();

    const normalizedStatus = String(reportStatus || 'open').toLowerCase();
    const safeLimit =
        Number.isInteger(limit) && limit > 0 && limit <= 500
            ? limit
            : 100;
    const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;

    let reportWhereClause = "r.status IN ('pending', 'reviewed')";

    if (normalizedStatus === 'pending') {
        reportWhereClause = "r.status = 'pending'";
    } else if (normalizedStatus === 'reviewed') {
        reportWhereClause = "r.status = 'reviewed'";
    } else if (normalizedStatus === 'resolved') {
        reportWhereClause = "r.status = 'resolved'";
    } else if (normalizedStatus === 'dismissed') {
        reportWhereClause = "r.status = 'dismissed'";
    } else if (normalizedStatus === 'closed') {
        reportWhereClause = "r.status IN ('resolved', 'dismissed')";
    }

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
                    d.status,
                    d.created_at AS "createdAt",
                    d.updated_at AS "updatedAt",
                    d.owner_user_id AS "ownerUserId",
                    owner_user.name AS "ownerName",
                    owner_user.email AS "ownerEmail",
                    report_stats.total_reports AS "totalReports",
                    report_stats.unique_reporter_count AS "uniqueReporterCount",
                    report_stats.latest_reported_at AS "latestReportedAt",
                    latest_reason.reason AS "latestReportReason",
                    latest_reason.status AS "latestReportStatus"
                FROM documents d
                INNER JOIN users owner_user ON owner_user.user_id = d.owner_user_id
                INNER JOIN (
                    SELECT
                        r.document_id,
                        COUNT(*)::INT AS total_reports,
                        COUNT(DISTINCT r.reporter_user_id)::INT AS unique_reporter_count,
                        MAX(r.created_at) AS latest_reported_at
                    FROM reports r
                    WHERE r.document_id IS NOT NULL
                      AND ${reportWhereClause}
                    GROUP BY r.document_id
                ) report_stats ON report_stats.document_id = d.document_id
                LEFT JOIN LATERAL (
                    SELECT r.reason, r.status
                    FROM reports r
                    WHERE r.document_id = d.document_id
                      AND ${reportWhereClause}
                    ORDER BY r.created_at DESC, r.report_id DESC
                    LIMIT 1
                ) latest_reason ON TRUE
                ORDER BY report_stats.unique_reporter_count DESC, report_stats.latest_reported_at DESC
                LIMIT $1 OFFSET $2;
            `,
            [safeLimit, safeOffset]
        );
        return result.rows;
    }

    const request = pool.request();
    request.input('limit', sql.Int, safeLimit);
    request.input('offset', sql.Int, safeOffset);

    const result = await request.query(`
        SELECT
            d.documentId,
            d.title,
            d.description,
            d.fileUrl,
            d.originalFileName,
            d.fileSizeBytes,
            d.mimeType,
            d.status,
            d.createdAt,
            d.updatedAt,
            d.ownerUserId,
            ownerUser.name AS ownerName,
            ownerUser.email AS ownerEmail,
            reportStats.totalReports,
            reportStats.uniqueReporterCount,
            reportStats.latestReportedAt,
            latestReason.reason AS latestReportReason,
            latestReason.status AS latestReportStatus
        FROM dbo.Documents d
        INNER JOIN dbo.Users ownerUser ON ownerUser.userId = d.ownerUserId
        INNER JOIN (
            SELECT
                r.documentId,
                COUNT(*) AS totalReports,
                COUNT(DISTINCT r.reporterUserId) AS uniqueReporterCount,
                MAX(r.createdAt) AS latestReportedAt
            FROM dbo.Reports r
            WHERE r.documentId IS NOT NULL
              AND ${reportWhereClause}
            GROUP BY r.documentId
        ) reportStats ON reportStats.documentId = d.documentId
        OUTER APPLY (
            SELECT TOP 1 r.reason, r.status
            FROM dbo.Reports r
            WHERE r.documentId = d.documentId
              AND ${reportWhereClause}
            ORDER BY r.createdAt DESC, r.reportId DESC
        ) latestReason
        ORDER BY reportStats.uniqueReporterCount DESC, reportStats.latestReportedAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `);

    return result.recordset;
};

const getOpenReporterUserIdsByDocument = async (documentId) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT DISTINCT r.reporter_user_id AS "reporterUserId"
                FROM reports r
                WHERE r.document_id = $1
                  AND r.status IN ('pending', 'reviewed');
            `,
            [documentId]
        );
        return result.rows.map((row) => row.reporterUserId);
    }

    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .query(`
            SELECT DISTINCT r.reporterUserId
            FROM dbo.Reports r
            WHERE r.documentId = @documentId
              AND r.status IN (N'pending', N'reviewed');
        `);

    return result.recordset.map((row) => row.reporterUserId);
};

const getDocumentReports = async ({ documentId, status = null }) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    r.report_id AS "reportId",
                    r.document_id AS "documentId",
                    r.reporter_user_id AS "reporterUserId",
                    reporter.name AS "reporterName",
                    reporter.email AS "reporterEmail",
                    r.reason,
                    r.status,
                    r.reviewed_by_user_id AS "reviewedByUserId",
                    reviewer.name AS "reviewedByName",
                    r.review_note AS "reviewNote",
                    r.created_at AS "createdAt",
                    r.reviewed_at AS "reviewedAt"
                FROM reports r
                INNER JOIN users reporter ON reporter.user_id = r.reporter_user_id
                LEFT JOIN users reviewer ON reviewer.user_id = r.reviewed_by_user_id
                WHERE r.document_id = $1
                  AND ($2::TEXT IS NULL OR r.status = $2)
                ORDER BY r.created_at DESC, r.report_id DESC;
            `,
            [documentId, status]
        );
        return result.rows;
    }

    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .input('status', sql.NVarChar(20), status)
        .query(`
            SELECT
                r.reportId,
                r.documentId,
                r.reporterUserId,
                reporter.name AS reporterName,
                reporter.email AS reporterEmail,
                r.reason,
                r.status,
                r.reviewedByUserId,
                reviewer.name AS reviewedByName,
                r.reviewNote,
                r.createdAt,
                r.reviewedAt
            FROM dbo.Reports r
            INNER JOIN dbo.Users reporter ON reporter.userId = r.reporterUserId
            LEFT JOIN dbo.Users reviewer ON reviewer.userId = r.reviewedByUserId
            WHERE r.documentId = @documentId
              AND (@status IS NULL OR r.status = @status)
            ORDER BY r.createdAt DESC, r.reportId DESC;
        `);

    return result.recordset;
};

const resolveOpenDocumentReports = async ({
    documentId,
    reviewedByUserId,
    status,
    reviewNote = null,
}) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                UPDATE reports
                SET
                    status = $3,
                    reviewed_by_user_id = $2,
                    review_note = $4,
                    reviewed_at = NOW()
                WHERE document_id = $1
                  AND status IN ('pending', 'reviewed');
            `,
            [documentId, reviewedByUserId, status, reviewNote]
        );

        return Number(result.rowCount || 0);
    }

    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .input('reviewedByUserId', sql.Int, reviewedByUserId)
        .input('status', sql.NVarChar(20), status)
        .input('reviewNote', sql.NVarChar(255), reviewNote)
        .query(`
            UPDATE dbo.Reports
            SET
                status = @status,
                reviewedByUserId = @reviewedByUserId,
                reviewNote = @reviewNote,
                reviewedAt = SYSDATETIME()
            WHERE documentId = @documentId
              AND status IN (N'pending', N'reviewed');

            SELECT @@ROWCOUNT AS affectedRows;
        `);

    return result.recordset[0]?.affectedRows || 0;
};

module.exports = {
    REPORT_AUTO_LOCK_THRESHOLD,
    createDocumentReport,
    getPendingDocumentReportQueue,
    getOpenReporterUserIdsByDocument,
    getDocumentReports,
    resolveOpenDocumentReports,
};
