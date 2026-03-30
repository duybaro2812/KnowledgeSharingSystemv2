const { getPool, sql } = require('../utils/db');

const REPORT_AUTO_LOCK_THRESHOLD = 5;

const createDocumentReport = async ({ documentId, reporterUserId, reason }) => {
    const pool = getPool();

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

const getPendingDocumentReportQueue = async () => {
    const pool = getPool();

    const result = await pool.request().query(`
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
            latestReason.reason AS latestReportReason
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
              AND r.status IN (N'pending', N'reviewed')
            GROUP BY r.documentId
        ) reportStats ON reportStats.documentId = d.documentId
        OUTER APPLY (
            SELECT TOP 1 r.reason
            FROM dbo.Reports r
            WHERE r.documentId = d.documentId
              AND r.status IN (N'pending', N'reviewed')
            ORDER BY r.createdAt DESC, r.reportId DESC
        ) latestReason
        ORDER BY reportStats.uniqueReporterCount DESC, reportStats.latestReportedAt DESC;
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
    resolveOpenDocumentReports,
};
