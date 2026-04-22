const { getPool, sql, isPostgresClient } = require('../utils/db');

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    (SELECT COUNT(1) FROM users) AS "totalUsers",
                    (SELECT COUNT(1) FROM users WHERE is_active = TRUE) AS "activeUsers",
                    (SELECT COUNT(1) FROM users WHERE is_active = FALSE) AS "lockedUsers",
                    (SELECT COUNT(1) FROM users WHERE role = 'moderator') AS "totalModerators",
                    (SELECT COUNT(1) FROM documents) AS "totalDocuments",
                    (SELECT COUNT(1) FROM documents WHERE status = 'approved') AS "approvedDocuments",
                    (SELECT COUNT(1) FROM documents WHERE status = 'rejected') AS "rejectedDocuments",
                    (
                        SELECT COUNT(1)
                        FROM document_access_logs
                        WHERE access_type = 'download'
                    ) AS "totalDownloads",
                    (
                        SELECT COUNT(1)
                        FROM document_access_logs
                        WHERE access_type = 'download'
                          AND access_date BETWEEN $1::DATE AND $2::DATE
                    ) AS "downloadsInRange",
                    (SELECT COUNT(1) FROM documents WHERE status = 'pending') AS "pendingDocuments",
                    (SELECT COUNT(1) FROM comments WHERE status = 'pending') AS "pendingComments",
                    (SELECT COUNT(1) FROM reports WHERE status IN ('pending', 'reviewed')) AS "pendingReports",
                    (SELECT COUNT(1) FROM point_events WHERE status = 'pending') AS "pendingPointEvents",
                    (
                        SELECT COUNT(1)
                        FROM document_plagiarism_reviews
                        WHERE created_at::DATE BETWEEN $1::DATE AND $2::DATE
                    ) AS "plagiarismReviewsInRange",
                    (
                        SELECT COUNT(1)
                        FROM comments
                        WHERE reviewed_at IS NOT NULL
                          AND reviewed_at::DATE BETWEEN $1::DATE AND $2::DATE
                    ) AS "commentsReviewedInRange",
                    (
                        SELECT COUNT(1)
                        FROM reports
                        WHERE reviewed_at IS NOT NULL
                          AND reviewed_at::DATE BETWEEN $1::DATE AND $2::DATE
                    ) AS "reportsReviewedInRange",
                    (
                        SELECT COUNT(1)
                        FROM point_events
                        WHERE reviewed_at IS NOT NULL
                          AND reviewed_at::DATE BETWEEN $1::DATE AND $2::DATE
                    ) AS "pointEventsReviewedInRange",
                    (
                        SELECT COUNT(1)
                        FROM documents
                        WHERE status = 'hidden'
                    ) AS "lockedDocuments",
                    (
                        SELECT COUNT(1)
                        FROM reports
                        WHERE status = 'resolved'
                          AND reviewed_at::DATE BETWEEN $1::DATE AND $2::DATE
                    ) AS "resolvedReportsInRange",
                    (
                        SELECT COUNT(1)
                        FROM reports
                        WHERE status = 'dismissed'
                          AND reviewed_at::DATE BETWEEN $1::DATE AND $2::DATE
                    ) AS "dismissedReportsInRange";
            `,
            [normalizedDateFrom, normalizedDateTo]
        );

        return {
            ...(result.rows[0] || {}),
            dateFrom: normalizedDateFrom,
            dateTo: normalizedDateTo,
        };
    }

    const request = pool.request();
    request.input('dateFrom', sql.Date, normalizedDateFrom);
    request.input('dateTo', sql.Date, normalizedDateTo);

    const tableCheck = await pool.request().query(`
        SELECT
            CASE WHEN OBJECT_ID(N'dbo.DocumentPlagiarismReviews', N'U') IS NULL THEN 0 ELSE 1 END AS hasPlagiarismTable,
            CASE WHEN OBJECT_ID(N'dbo.AdminActionLogs', N'U') IS NULL THEN 0 ELSE 1 END AS hasAdminActionLogsTable,
            CASE WHEN OBJECT_ID(N'dbo.UserActivityLogs', N'U') IS NULL THEN 0 ELSE 1 END AS hasUserActivityLogsTable;
    `);
    const hasPlagiarismReviewTable =
        Number(tableCheck.recordset?.[0]?.hasPlagiarismTable || 0) === 1;
    const hasAdminActionLogsTable =
        Number(tableCheck.recordset?.[0]?.hasAdminActionLogsTable || 0) === 1;
    const hasUserActivityLogsTable =
        Number(tableCheck.recordset?.[0]?.hasUserActivityLogsTable || 0) === 1;

    const adminActionTimelineUnion = hasAdminActionLogsTable
        ? `
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
        `
        : `
            SELECT
                N'admin_action' AS source,
                CAST(0 AS BIGINT) AS sourceId,
                CAST(NULL AS DATETIME2) AS createdAt,
                CAST(NULL AS NVARCHAR(100)) AS action,
                CAST(NULL AS INT) AS actorUserId,
                CAST(NULL AS NVARCHAR(255)) AS actorName,
                CAST(NULL AS NVARCHAR(20)) AS actorRole,
                CAST(NULL AS NVARCHAR(30)) AS targetType,
                CAST(NULL AS INT) AS targetId,
                CAST(NULL AS NVARCHAR(255)) AS targetName,
                CAST(NULL AS NVARCHAR(50)) AS decision,
                CAST(NULL AS NVARCHAR(255)) AS note
            WHERE 1 = 0
        `;

    const documentActionTimelineUnion = hasUserActivityLogsTable
        ? `
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
        `
        : ``;

    const plagiarismStatsSelect = hasPlagiarismReviewTable
        ? `
            (
                SELECT COUNT(1)
                FROM dbo.DocumentPlagiarismReviews
                WHERE CAST(createdAt AS DATE) BETWEEN @dateFrom AND @dateTo
            ) AS plagiarismReviewsInRange,
        `
        : `
            CAST(0 AS INT) AS plagiarismReviewsInRange,
        `;

    const result = await request.query(`
        SELECT
            -- Platform overview
            (SELECT COUNT(1) FROM dbo.Users) AS totalUsers,
            (SELECT COUNT(1) FROM dbo.Users WHERE isActive = 1) AS activeUsers,
            (SELECT COUNT(1) FROM dbo.Users WHERE isActive = 0) AS lockedUsers,
            (SELECT COUNT(1) FROM dbo.Users WHERE role = N'moderator') AS totalModerators,
            (SELECT COUNT(1) FROM dbo.Documents) AS totalDocuments,
            (SELECT COUNT(1) FROM dbo.Documents WHERE status = N'approved') AS approvedDocuments,
            (SELECT COUNT(1) FROM dbo.Documents WHERE status = N'rejected') AS rejectedDocuments,
            (
                SELECT COUNT(1)
                FROM dbo.DocumentAccessLogs
                WHERE accessType = N'download'
            ) AS totalDownloads,
            (
                SELECT COUNT(1)
                FROM dbo.DocumentAccessLogs
                WHERE accessType = N'download'
                  AND CAST(accessDate AS DATE) BETWEEN @dateFrom AND @dateTo
            ) AS downloadsInRange,

            -- Pending queues
            (SELECT COUNT(1) FROM dbo.Documents WHERE status = N'pending') AS pendingDocuments,
            (SELECT COUNT(1) FROM dbo.Comments WHERE status = N'pending') AS pendingComments,
            (SELECT COUNT(1) FROM dbo.Reports WHERE status IN (N'pending', N'reviewed')) AS pendingReports,
            (SELECT COUNT(1) FROM dbo.PointEvents WHERE status = N'pending') AS pendingPointEvents,
            ${plagiarismStatsSelect}

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                WITH timeline AS (
                    SELECT
                        'admin_action'::TEXT AS source,
                        al.log_id::BIGINT AS "sourceId",
                        al.created_at AS "createdAt",
                        al.action_type AS action,
                        al.actor_user_id AS "actorUserId",
                        actor.name AS "actorName",
                        actor.role AS "actorRole",
                        'user'::TEXT AS "targetType",
                        al.target_user_id AS "targetId",
                        target_user.name AS "targetName",
                        NULL::TEXT AS decision,
                        al.note AS note
                    FROM admin_action_logs al
                    INNER JOIN users actor ON actor.user_id = al.actor_user_id
                    INNER JOIN users target_user ON target_user.user_id = al.target_user_id
                    WHERE al.created_at::DATE BETWEEN $1::DATE AND $2::DATE

                    UNION ALL

                    SELECT
                        'document_action'::TEXT AS source,
                        ual.log_id::BIGINT AS "sourceId",
                        ual.created_at AS "createdAt",
                        ual.action AS action,
                        ual.user_id AS "actorUserId",
                        actor.name AS "actorName",
                        actor.role AS "actorRole",
                        ual.target_type AS "targetType",
                        ual.target_id AS "targetId",
                        d.title AS "targetName",
                        NULL::TEXT AS decision,
                        NULL::TEXT AS note
                    FROM user_activity_logs ual
                    INNER JOIN users actor ON actor.user_id = ual.user_id
                    LEFT JOIN documents d ON d.document_id = ual.target_id AND ual.target_type = 'document'
                    WHERE ual.action IN (
                        'lock_document',
                        'unlock_document',
                        'delete_document',
                        'resolve_report_unlock_document',
                        'deduct_points_on_delete'
                    )
                      AND ual.created_at::DATE BETWEEN $1::DATE AND $2::DATE

                    UNION ALL

                    SELECT
                        'plagiarism_review'::TEXT AS source,
                        pr.plagiarism_review_id::BIGINT AS "sourceId",
                        pr.created_at AS "createdAt",
                        'review_plagiarism'::TEXT AS action,
                        pr.reviewed_by_user_id AS "actorUserId",
                        actor.name AS "actorName",
                        actor.role AS "actorRole",
                        'document'::TEXT AS "targetType",
                        pr.document_id AS "targetId",
                        d.title AS "targetName",
                        pr.decision AS decision,
                        pr.note AS note
                    FROM document_plagiarism_reviews pr
                    INNER JOIN users actor ON actor.user_id = pr.reviewed_by_user_id
                    LEFT JOIN documents d ON d.document_id = pr.document_id
                    WHERE pr.created_at::DATE BETWEEN $1::DATE AND $2::DATE

                    UNION ALL

                    SELECT
                        'report_review'::TEXT AS source,
                        r.report_id::BIGINT AS "sourceId",
                        r.reviewed_at AS "createdAt",
                        'review_report'::TEXT AS action,
                        r.reviewed_by_user_id AS "actorUserId",
                        actor.name AS "actorName",
                        actor.role AS "actorRole",
                        'document'::TEXT AS "targetType",
                        r.document_id AS "targetId",
                        d.title AS "targetName",
                        r.status AS decision,
                        r.review_note AS note
                    FROM reports r
                    INNER JOIN users actor ON actor.user_id = r.reviewed_by_user_id
                    LEFT JOIN documents d ON d.document_id = r.document_id
                    WHERE r.reviewed_at IS NOT NULL
                      AND r.reviewed_at::DATE BETWEEN $1::DATE AND $2::DATE

                    UNION ALL

                    SELECT
                        'comment_review'::TEXT AS source,
                        c.comment_id::BIGINT AS "sourceId",
                        c.reviewed_at AS "createdAt",
                        'review_comment'::TEXT AS action,
                        c.reviewed_by_user_id AS "actorUserId",
                        actor.name AS "actorName",
                        actor.role AS "actorRole",
                        'comment'::TEXT AS "targetType",
                        c.comment_id AS "targetId",
                        LEFT(c.content, 150) AS "targetName",
                        c.status AS decision,
                        c.review_note AS note
                    FROM comments c
                    INNER JOIN users actor ON actor.user_id = c.reviewed_by_user_id
                    WHERE c.reviewed_at IS NOT NULL
                      AND c.reviewed_at::DATE BETWEEN $1::DATE AND $2::DATE

                    UNION ALL

                    SELECT
                        'point_review'::TEXT AS source,
                        pe.event_id::BIGINT AS "sourceId",
                        pe.reviewed_at AS "createdAt",
                        'review_point_event'::TEXT AS action,
                        pe.reviewed_by_user_id AS "actorUserId",
                        actor.name AS "actorName",
                        actor.role AS "actorRole",
                        'point_event'::TEXT AS "targetType",
                        pe.event_id AS "targetId",
                        pe.event_type AS "targetName",
                        pe.status AS decision,
                        pe.review_note AS note
                    FROM point_events pe
                    INNER JOIN users actor ON actor.user_id = pe.reviewed_by_user_id
                    WHERE pe.reviewed_at IS NOT NULL
                      AND pe.reviewed_at::DATE BETWEEN $1::DATE AND $2::DATE
                ),
                filtered AS (
                    SELECT *
                    FROM timeline
                    WHERE ($3::INT IS NULL OR "actorUserId" = $3)
                      AND ($4::TEXT IS NULL OR source = $4)
                )
                SELECT *
                FROM filtered
                ORDER BY "createdAt" DESC, "sourceId" DESC
                OFFSET $5 LIMIT $6;
            `,
            [
                normalizedDateFrom,
                normalizedDateTo,
                actorUserId,
                normalizedSource,
                safeOffset,
                safeLimit,
            ]
        );

        const countResult = await pool.query(
            `
                WITH timeline AS (
                    SELECT 'admin_action'::TEXT AS source, al.log_id::BIGINT AS "sourceId", al.created_at AS "createdAt", al.actor_user_id AS "actorUserId"
                    FROM admin_action_logs al
                    WHERE al.created_at::DATE BETWEEN $1::DATE AND $2::DATE

                    UNION ALL
                    SELECT 'document_action'::TEXT AS source, ual.log_id::BIGINT AS "sourceId", ual.created_at AS "createdAt", ual.user_id AS "actorUserId"
                    FROM user_activity_logs ual
                    WHERE ual.action IN (
                        'lock_document',
                        'unlock_document',
                        'delete_document',
                        'resolve_report_unlock_document',
                        'deduct_points_on_delete'
                    )
                      AND ual.created_at::DATE BETWEEN $1::DATE AND $2::DATE

                    UNION ALL
                    SELECT 'plagiarism_review'::TEXT AS source, pr.plagiarism_review_id::BIGINT AS "sourceId", pr.created_at AS "createdAt", pr.reviewed_by_user_id AS "actorUserId"
                    FROM document_plagiarism_reviews pr
                    WHERE pr.created_at::DATE BETWEEN $1::DATE AND $2::DATE

                    UNION ALL
                    SELECT 'report_review'::TEXT AS source, r.report_id::BIGINT AS "sourceId", r.reviewed_at AS "createdAt", r.reviewed_by_user_id AS "actorUserId"
                    FROM reports r
                    WHERE r.reviewed_at IS NOT NULL
                      AND r.reviewed_at::DATE BETWEEN $1::DATE AND $2::DATE

                    UNION ALL
                    SELECT 'comment_review'::TEXT AS source, c.comment_id::BIGINT AS "sourceId", c.reviewed_at AS "createdAt", c.reviewed_by_user_id AS "actorUserId"
                    FROM comments c
                    WHERE c.reviewed_at IS NOT NULL
                      AND c.reviewed_at::DATE BETWEEN $1::DATE AND $2::DATE

                    UNION ALL
                    SELECT 'point_review'::TEXT AS source, pe.event_id::BIGINT AS "sourceId", pe.reviewed_at AS "createdAt", pe.reviewed_by_user_id AS "actorUserId"
                    FROM point_events pe
                    WHERE pe.reviewed_at IS NOT NULL
                      AND pe.reviewed_at::DATE BETWEEN $1::DATE AND $2::DATE
                )
                SELECT COUNT(1)::INT AS "totalRows"
                FROM timeline
                WHERE ($3::INT IS NULL OR "actorUserId" = $3)
                  AND ($4::TEXT IS NULL OR source = $4);
            `,
            [normalizedDateFrom, normalizedDateTo, actorUserId, normalizedSource]
        );

        const rows = result.rows || [];
        const totalRows = Number(countResult.rows?.[0]?.totalRows || 0);

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
    }

    const request = pool.request();
    request.input('dateFrom', sql.Date, normalizedDateFrom);
    request.input('dateTo', sql.Date, normalizedDateTo);
    request.input('limit', sql.Int, safeLimit);
    request.input('offset', sql.Int, safeOffset);
    request.input('actorUserId', sql.Int, actorUserId);
    request.input('source', sql.NVarChar(30), normalizedSource);

    const tableCheck = await pool.request().query(`
        SELECT
            CASE WHEN OBJECT_ID(N'dbo.DocumentPlagiarismReviews', N'U') IS NULL THEN 0 ELSE 1 END AS hasPlagiarismTable,
            CASE WHEN OBJECT_ID(N'dbo.AdminActionLogs', N'U') IS NULL THEN 0 ELSE 1 END AS hasAdminActionLogsTable,
            CASE WHEN OBJECT_ID(N'dbo.UserActivityLogs', N'U') IS NULL THEN 0 ELSE 1 END AS hasUserActivityLogsTable;
    `);
    const hasPlagiarismReviewTable =
        Number(tableCheck.recordset?.[0]?.hasPlagiarismTable || 0) === 1;
    const hasAdminActionLogsTable =
        Number(tableCheck.recordset?.[0]?.hasAdminActionLogsTable || 0) === 1;
    const hasUserActivityLogsTable =
        Number(tableCheck.recordset?.[0]?.hasUserActivityLogsTable || 0) === 1;

    const adminActionTimelineUnion = hasAdminActionLogsTable
        ? `
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
        `
        : `
            SELECT
                N'admin_action' AS source,
                CAST(0 AS BIGINT) AS sourceId,
                CAST(NULL AS DATETIME2) AS createdAt,
                CAST(NULL AS NVARCHAR(100)) AS action,
                CAST(NULL AS INT) AS actorUserId,
                CAST(NULL AS NVARCHAR(255)) AS actorName,
                CAST(NULL AS NVARCHAR(20)) AS actorRole,
                CAST(NULL AS NVARCHAR(30)) AS targetType,
                CAST(NULL AS INT) AS targetId,
                CAST(NULL AS NVARCHAR(255)) AS targetName,
                CAST(NULL AS NVARCHAR(50)) AS decision,
                CAST(NULL AS NVARCHAR(255)) AS note
            WHERE 1 = 0
        `;

    const documentActionTimelineUnion = hasUserActivityLogsTable
        ? `
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
        `
        : ``;

    const plagiarismTimelineUnion = hasPlagiarismReviewTable
        ? `
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
        `
        : ``;

    const adminActionCountUnion = hasAdminActionLogsTable
        ? `
            SELECT N'admin_action' AS source, al.logId AS sourceId, al.createdAt, al.actorUserId
            FROM dbo.AdminActionLogs al
            WHERE CAST(al.createdAt AS DATE) BETWEEN @dateFrom AND @dateTo
        `
        : `
            SELECT CAST(NULL AS NVARCHAR(30)) AS source, CAST(NULL AS BIGINT) AS sourceId, CAST(NULL AS DATETIME2) AS createdAt, CAST(NULL AS INT) AS actorUserId
            WHERE 1 = 0
        `;

    const documentActionCountUnion = hasUserActivityLogsTable
        ? `
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
        `
        : ``;

    const plagiarismCountUnion = hasPlagiarismReviewTable
        ? `
            UNION ALL

            SELECT N'plagiarism_review' AS source, pr.plagiarismReviewId AS sourceId, pr.createdAt, pr.reviewedByUserId AS actorUserId
            FROM dbo.DocumentPlagiarismReviews pr
            WHERE CAST(pr.createdAt AS DATE) BETWEEN @dateFrom AND @dateTo
        `
        : ``;

    const result = await request.query(`
        ;WITH timeline AS (
            ${adminActionTimelineUnion}
            ${documentActionTimelineUnion}
            ${plagiarismTimelineUnion}

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
            ${adminActionCountUnion}
            ${documentActionCountUnion}
            ${plagiarismCountUnion}

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
