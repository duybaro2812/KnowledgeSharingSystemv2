const { getPool, sql } = require('../utils/db');

const toDateOnlyString = (date) => date.toISOString().slice(0, 10);

const getDefaultDateRange = () => {
    const now = new Date();
    const dateTo = toDateOnlyString(now);

    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    const dateFrom = toDateOnlyString(from);

    return { dateFrom, dateTo };
};

const getModerationStats = async ({ dateFrom = null, dateTo = null } = {}) => {
    const pool = getPool();
    const defaultRange = getDefaultDateRange();

    const normalizedDateFrom = dateFrom || defaultRange.dateFrom;
    const normalizedDateTo = dateTo || defaultRange.dateTo;

    const request = pool.request();
    request.input('dateFrom', sql.Date, normalizedDateFrom);
    request.input('dateTo', sql.Date, normalizedDateTo);

    const result = await request.query(`
        SELECT
            -- Pending queues
            (SELECT COUNT(1) FROM dbo.Documents WHERE status = N'pending') AS pendingDocuments,
            (SELECT COUNT(1) FROM dbo.Comments WHERE status = N'pending') AS pendingComments,
            (SELECT COUNT(1) FROM dbo.Reports WHERE status IN (N'pending', N'reviewed')) AS pendingReports,
            (SELECT COUNT(1) FROM dbo.PointEvents WHERE status = N'pending') AS pendingPointEvents,
            (
                SELECT COUNT(1)
                FROM dbo.DocumentPlagiarismReviews
                WHERE CAST(createdAt AS DATE) BETWEEN @dateFrom AND @dateTo
            ) AS plagiarismReviewsInRange,

            -- Reviewed in range
            (
                SELECT COUNT(1)
                FROM dbo.Comments
                WHERE reviewedAt IS NOT NULL
                  AND CAST(reviewedAt AS DATE) BETWEEN @dateFrom AND @dateTo
            ) AS commentsReviewedInRange,
            (
                SELECT COUNT(1)
                FROM dbo.Reports
                WHERE reviewedAt IS NOT NULL
                  AND CAST(reviewedAt AS DATE) BETWEEN @dateFrom AND @dateTo
            ) AS reportsReviewedInRange,
            (
                SELECT COUNT(1)
                FROM dbo.PointEvents
                WHERE reviewedAt IS NOT NULL
                  AND CAST(reviewedAt AS DATE) BETWEEN @dateFrom AND @dateTo
            ) AS pointEventsReviewedInRange,

            -- Quality/risk counters
            (
                SELECT COUNT(1)
                FROM dbo.Documents
                WHERE status = N'hidden'
            ) AS lockedDocuments,
            (
                SELECT COUNT(1)
                FROM dbo.Reports
                WHERE status = N'resolved'
                  AND CAST(reviewedAt AS DATE) BETWEEN @dateFrom AND @dateTo
            ) AS resolvedReportsInRange,
            (
                SELECT COUNT(1)
                FROM dbo.Reports
                WHERE status = N'dismissed'
                  AND CAST(reviewedAt AS DATE) BETWEEN @dateFrom AND @dateTo
            ) AS dismissedReportsInRange;
    `);

    return {
        ...(result.recordset[0] || {}),
        dateFrom: normalizedDateFrom,
        dateTo: normalizedDateTo,
    };
};

const getModerationTimeline = async ({
    dateFrom = null,
    dateTo = null,
    limit = 50,
    offset = 0,
    actorUserId = null,
    source = null,
} = {}) => {
    const pool = getPool();
    const defaultRange = getDefaultDateRange();

    const normalizedDateFrom = dateFrom || defaultRange.dateFrom;
    const normalizedDateTo = dateTo || defaultRange.dateTo;
    const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 200) : 50;
    const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;
    const normalizedSource = source ? String(source).trim().toLowerCase() : null;

    const request = pool.request();
    request.input('dateFrom', sql.Date, normalizedDateFrom);
    request.input('dateTo', sql.Date, normalizedDateTo);
    request.input('limit', sql.Int, safeLimit);
    request.input('offset', sql.Int, safeOffset);
    request.input('actorUserId', sql.Int, actorUserId);
    request.input('source', sql.NVarChar(30), normalizedSource);

    const result = await request.query(`
        ;WITH timeline AS (
            -- Admin user-management actions
            SELECT
                N'admin_action' AS source,
                CAST(al.logId AS BIGINT) AS sourceId,
                al.createdAt,
                al.actionType AS action,
                al.actorUserId,
                actor.name AS actorName,
                actor.role AS actorRole,
                N'user' AS targetType,
                al.targetUserId AS targetId,
                targetUser.name AS targetName,
                NULL AS decision,
                al.note AS note
            FROM dbo.AdminActionLogs al
            INNER JOIN dbo.Users actor ON actor.userId = al.actorUserId
            INNER JOIN dbo.Users targetUser ON targetUser.userId = al.targetUserId
            WHERE CAST(al.createdAt AS DATE) BETWEEN @dateFrom AND @dateTo

            UNION ALL

            -- Document moderation actions
            SELECT
                N'document_action' AS source,
                CAST(ual.logId AS BIGINT) AS sourceId,
                ual.createdAt,
                ual.action,
                ual.userId AS actorUserId,
                actor.name AS actorName,
                actor.role AS actorRole,
                ual.targetType AS targetType,
                ual.targetId AS targetId,
                d.title AS targetName,
                NULL AS decision,
                NULL AS note
            FROM dbo.UserActivityLogs ual
            INNER JOIN dbo.Users actor ON actor.userId = ual.userId
            LEFT JOIN dbo.Documents d ON d.documentId = ual.targetId AND ual.targetType = N'document'
            WHERE ual.action IN (
                N'lock_document',
                N'unlock_document',
                N'delete_document',
                N'resolve_report_unlock_document',
                N'deduct_points_on_delete'
            )
              AND CAST(ual.createdAt AS DATE) BETWEEN @dateFrom AND @dateTo

            UNION ALL

            -- Plagiarism review actions
            SELECT
                N'plagiarism_review' AS source,
                CAST(pr.plagiarismReviewId AS BIGINT) AS sourceId,
                pr.createdAt,
                N'review_plagiarism' AS action,
                pr.reviewedByUserId AS actorUserId,
                actor.name AS actorName,
                actor.role AS actorRole,
                N'document' AS targetType,
                pr.documentId AS targetId,
                d.title AS targetName,
                pr.decision AS decision,
                pr.note AS note
            FROM dbo.DocumentPlagiarismReviews pr
            INNER JOIN dbo.Users actor ON actor.userId = pr.reviewedByUserId
            LEFT JOIN dbo.Documents d ON d.documentId = pr.documentId
            WHERE CAST(pr.createdAt AS DATE) BETWEEN @dateFrom AND @dateTo

            UNION ALL

            -- Report review actions
            SELECT
                N'report_review' AS source,
                CAST(r.reportId AS BIGINT) AS sourceId,
                r.reviewedAt AS createdAt,
                N'review_report' AS action,
                r.reviewedByUserId AS actorUserId,
                actor.name AS actorName,
                actor.role AS actorRole,
                N'document' AS targetType,
                r.documentId AS targetId,
                d.title AS targetName,
                r.status AS decision,
                r.reviewNote AS note
            FROM dbo.Reports r
            INNER JOIN dbo.Users actor ON actor.userId = r.reviewedByUserId
            LEFT JOIN dbo.Documents d ON d.documentId = r.documentId
            WHERE r.reviewedAt IS NOT NULL
              AND CAST(r.reviewedAt AS DATE) BETWEEN @dateFrom AND @dateTo

            UNION ALL

            -- Comment review actions
            SELECT
                N'comment_review' AS source,
                CAST(c.commentId AS BIGINT) AS sourceId,
                c.reviewedAt AS createdAt,
                N'review_comment' AS action,
                c.reviewedByUserId AS actorUserId,
                actor.name AS actorName,
                actor.role AS actorRole,
                N'comment' AS targetType,
                c.commentId AS targetId,
                LEFT(c.content, 150) AS targetName,
                c.status AS decision,
                c.reviewNote AS note
            FROM dbo.Comments c
            INNER JOIN dbo.Users actor ON actor.userId = c.reviewedByUserId
            WHERE c.reviewedAt IS NOT NULL
              AND CAST(c.reviewedAt AS DATE) BETWEEN @dateFrom AND @dateTo

            UNION ALL

            -- Point-event review actions
            SELECT
                N'point_review' AS source,
                CAST(pe.eventId AS BIGINT) AS sourceId,
                pe.reviewedAt AS createdAt,
                N'review_point_event' AS action,
                pe.reviewedByUserId AS actorUserId,
                actor.name AS actorName,
                actor.role AS actorRole,
                N'point_event' AS targetType,
                pe.eventId AS targetId,
                pe.eventType AS targetName,
                pe.status AS decision,
                pe.reviewNote AS note
            FROM dbo.PointEvents pe
            INNER JOIN dbo.Users actor ON actor.userId = pe.reviewedByUserId
            WHERE pe.reviewedAt IS NOT NULL
              AND CAST(pe.reviewedAt AS DATE) BETWEEN @dateFrom AND @dateTo
        )
        SELECT
            t.source,
            t.sourceId,
            t.createdAt,
            t.action,
            t.actorUserId,
            t.actorName,
            t.actorRole,
            t.targetType,
            t.targetId,
            t.targetName,
            t.decision,
            t.note
        FROM timeline t
        WHERE (@actorUserId IS NULL OR t.actorUserId = @actorUserId)
          AND (@source IS NULL OR t.source = @source)
        ORDER BY t.createdAt DESC, t.sourceId DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

        ;WITH timelineCount AS (
            SELECT N'admin_action' AS source, al.logId AS sourceId, al.createdAt, al.actorUserId
            FROM dbo.AdminActionLogs al
            WHERE CAST(al.createdAt AS DATE) BETWEEN @dateFrom AND @dateTo

            UNION ALL

            SELECT N'document_action' AS source, ual.logId AS sourceId, ual.createdAt, ual.userId AS actorUserId
            FROM dbo.UserActivityLogs ual
            WHERE ual.action IN (
                N'lock_document',
                N'unlock_document',
                N'delete_document',
                N'resolve_report_unlock_document',
                N'deduct_points_on_delete'
            )
              AND CAST(ual.createdAt AS DATE) BETWEEN @dateFrom AND @dateTo

            UNION ALL

            SELECT N'plagiarism_review' AS source, pr.plagiarismReviewId AS sourceId, pr.createdAt, pr.reviewedByUserId AS actorUserId
            FROM dbo.DocumentPlagiarismReviews pr
            WHERE CAST(pr.createdAt AS DATE) BETWEEN @dateFrom AND @dateTo

            UNION ALL

            SELECT N'report_review' AS source, r.reportId AS sourceId, r.reviewedAt AS createdAt, r.reviewedByUserId AS actorUserId
            FROM dbo.Reports r
            WHERE r.reviewedAt IS NOT NULL
              AND CAST(r.reviewedAt AS DATE) BETWEEN @dateFrom AND @dateTo

            UNION ALL

            SELECT N'comment_review' AS source, c.commentId AS sourceId, c.reviewedAt AS createdAt, c.reviewedByUserId AS actorUserId
            FROM dbo.Comments c
            WHERE c.reviewedAt IS NOT NULL
              AND CAST(c.reviewedAt AS DATE) BETWEEN @dateFrom AND @dateTo

            UNION ALL

            SELECT N'point_review' AS source, pe.eventId AS sourceId, pe.reviewedAt AS createdAt, pe.reviewedByUserId AS actorUserId
            FROM dbo.PointEvents pe
            WHERE pe.reviewedAt IS NOT NULL
              AND CAST(pe.reviewedAt AS DATE) BETWEEN @dateFrom AND @dateTo
        )
        SELECT COUNT(1) AS totalRows
        FROM timelineCount tc
        WHERE (@actorUserId IS NULL OR tc.actorUserId = @actorUserId)
          AND (@source IS NULL OR tc.source = @source);
    `);

    const rows = result.recordsets?.[0] || [];
    const totalRows = Number(result.recordsets?.[1]?.[0]?.totalRows || 0);

    return {
        rows,
        totalRows,
        limit: safeLimit,
        offset: safeOffset,
        dateFrom: normalizedDateFrom,
        dateTo: normalizedDateTo,
        actorUserId: actorUserId || null,
        source: normalizedSource,
    };
};

module.exports = {
    getModerationStats,
    getModerationTimeline,
};
