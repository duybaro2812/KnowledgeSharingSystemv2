const { getPool, sql } = require('../utils/db');
const notificationStream = require('../services/notification-stream.service');

const parseMetadata = (value) => {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'object') {
        return value;
    }

    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    try {
        return JSON.parse(trimmed);
    } catch {
        return { raw: value };
    }
};

const inferActionByType = (type) => {
    const map = {
        document_upload_rejected: 'document.upload_rejected',
        document_upload_success: 'document.approved',
        document_rejected: 'document.rejected',
        document_locked: 'document.locked',
        document_unlocked: 'document.unlocked',
        document_deleted: 'document.deleted',
        document_auto_locked: 'document.auto_locked',
        document_reported: 'document.reported',
        plagiarism_suspected: 'document.plagiarism_suspected',
        plagiarism_approved_anyway: 'document.plagiarism_approved_anyway',
        plagiarism_rejected_duplicate: 'document.plagiarism_rejected_duplicate',
        report_resolved_unlocked: 'report.resolved_unlock',
        report_resolved_deleted: 'report.resolved_delete',
        document_liked: 'document.liked',
        document_disliked: 'document.disliked',
        document_saved: 'document.saved',
        comment_pending_moderation: 'comment.pending_moderation',
        comment_reply_pending_moderation: 'comment.reply_pending_moderation',
        comment_approved: 'comment.approved',
        comment_rejected: 'comment.rejected',
        comment_reply_approved: 'comment.reply_approved',
        document_comment_approved: 'comment.document_approved',
        comment_points_pending_review: 'point.pending_from_comment',
        point_event_pending_review: 'point.pending',
        point_event_approved: 'point.approved',
        point_event_rejected: 'point.rejected',
        qa_session_opened: 'qa.opened',
        qa_session_message: 'qa.message',
        qa_session_closed: 'qa.closed',
        qa_rating_pending_review: 'qa.rating_pending_review',
        account_locked: 'user.locked',
        account_unlocked: 'user.unlocked',
        account_soft_deleted: 'user.soft_deleted',
        role_promoted_moderator: 'user.promoted_moderator',
        role_changed_user: 'user.demoted_user',
    };

    return map[type] || null;
};

const normalizeMetadataShape = ({ type, metadata }) => {
    const source = parseMetadata(metadata);
    if (!source || typeof source !== 'object') {
        return source;
    }

    const normalized = { ...source };

    if (!normalized.commentId && Number.isInteger(Number(normalized.replyCommentId))) {
        normalized.commentId = Number(normalized.replyCommentId);
    }

    if (!normalized.sessionId && Number.isInteger(Number(normalized.qaSessionId))) {
        normalized.sessionId = Number(normalized.qaSessionId);
    }

    if (!normalized.eventId && Number.isInteger(Number(normalized.pointEventId))) {
        normalized.eventId = Number(normalized.pointEventId);
    }

    const sourceUserCandidates = [
        normalized.sourceUserId,
        normalized.actorUserId,
        normalized.authorUserId,
        normalized.reactorUserId,
        normalized.saverUserId,
        normalized.senderUserId,
        normalized.reporterUserId,
        normalized.askedByUserId,
        normalized.closedByUserId,
        normalized.deletedByUserId,
        normalized.moderatorUserId,
        normalized.reviewedByUserId,
    ];

    const sourceUserId = sourceUserCandidates
        .map((v) => Number(v))
        .find((v) => Number.isInteger(v) && v > 0);
    if (sourceUserId && !normalized.sourceUserId) {
        normalized.sourceUserId = sourceUserId;
    }

    if (!normalized.action) {
        normalized.action = inferActionByType(type);
    }

    if (!normalized.target) {
        if (Number.isInteger(Number(normalized.commentId)) && Number(normalized.commentId) > 0) {
            normalized.target = { type: 'comment', id: Number(normalized.commentId) };
        } else if (
            Number.isInteger(Number(normalized.sessionId)) &&
            Number(normalized.sessionId) > 0
        ) {
            normalized.target = { type: 'qa_session', id: Number(normalized.sessionId) };
        } else if (
            Number.isInteger(Number(normalized.documentId)) &&
            Number(normalized.documentId) > 0
        ) {
            normalized.target = { type: 'document', id: Number(normalized.documentId) };
        } else if (Number.isInteger(Number(normalized.eventId)) && Number(normalized.eventId) > 0) {
            normalized.target = { type: 'point_event', id: Number(normalized.eventId) };
        }
    }

    return normalized;
};

const buildTargetRoute = ({ type, metadata }) => {
    if (!metadata || typeof metadata !== 'object') {
        return null;
    }

    if (metadata.route && typeof metadata.route === 'string') {
        return metadata.route;
    }

    const documentId = Number(metadata.documentId);
    const commentId = Number(metadata.commentId);
    const qaSessionId = Number(metadata.qaSessionId || metadata.sessionId);
    const targetType = metadata.target?.type;
    const targetId = Number(metadata.target?.id);

    if (targetType === 'moderation_queue') {
        return '/moderation';
    }

    if (targetType === 'user' && Number.isInteger(targetId) && targetId > 0) {
        return '/profile';
    }

    if (Number.isInteger(qaSessionId) && qaSessionId > 0) {
        return `/qa-sessions/${qaSessionId}`;
    }

    if (Number.isInteger(documentId) && documentId > 0) {
        if (Number.isInteger(commentId) && commentId > 0) {
            return `/documents/${documentId}?commentId=${commentId}`;
        }

        return `/documents/${documentId}`;
    }

    if (type?.startsWith('point_') || type?.includes('point')) {
        return '/points';
    }

    return null;
};

const enrichMetadata = ({ type, metadata }) => {
    const normalizedMetadata = normalizeMetadataShape({ type, metadata });

    if (!normalizedMetadata || typeof normalizedMetadata !== 'object') {
        return normalizedMetadata;
    }

    const route = buildTargetRoute({ type, metadata: normalizedMetadata });

    return {
        ...normalizedMetadata,
        route: normalizedMetadata.route || route || null,
    };
};

const normalizeNotification = (record) => {
    const metadata = enrichMetadata({
        type: record?.type || '',
        metadata: record?.metadata,
    });
    const targetRoute = buildTargetRoute({
        type: record?.type || '',
        metadata,
    });

    return {
        ...record,
        metadata,
        targetRoute,
    };
};

const createNotification = async ({ userId, type, title, message, metadata = null }) => {
    const pool = getPool();
    const enrichedMetadata = enrichMetadata({ type, metadata });
    const metadataPayload =
        enrichedMetadata && typeof enrichedMetadata === 'string'
            ? enrichedMetadata
            : enrichedMetadata
                ? JSON.stringify(enrichedMetadata)
                : null;

    const result = await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('type', sql.NVarChar(50), type)
        .input('title', sql.NVarChar(150), title)
        .input('message', sql.NVarChar(500), message)
        .input('metadata', sql.NVarChar(sql.MAX), metadataPayload)
        .query(`
            INSERT INTO dbo.Notifications (userId, type, title, message, metadata)
            OUTPUT
                inserted.notificationId,
                inserted.userId,
                inserted.type,
                inserted.title,
                inserted.message,
                inserted.metadata,
                inserted.isRead,
                inserted.createdAt,
                inserted.readAt
            VALUES (@userId, @type, @title, @message, @metadata);
        `);

    const insertedRaw = result.recordset?.[0] || null;
    const inserted = insertedRaw ? normalizeNotification(insertedRaw) : null;

    if (inserted) {
        notificationStream.pushToUser({
            userId,
            payload: {
                event: 'notification_created',
                data: inserted,
            },
        });
    }

    return inserted;
};

const getMyNotifications = async ({ userId, isRead = null }) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('isRead', sql.Bit, isRead)
        .execute('dbo.usp_GetMyNotifications');

    return (result.recordset || []).map(normalizeNotification);
};

const markNotificationAsRead = async ({ notificationId, userId }) => {
    const pool = getPool();

    await pool
        .request()
        .input('notificationId', sql.Int, notificationId)
        .input('userId', sql.Int, userId)
        .execute('dbo.usp_MarkNotificationAsRead');
};

const markAllNotificationsAsRead = async ({ userId }) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('userId', sql.Int, userId)
        .query(`
            UPDATE dbo.Notifications
            SET
                isRead = 1,
                readAt = CASE WHEN readAt IS NULL THEN SYSDATETIME() ELSE readAt END
            WHERE userId = @userId
              AND isRead = 0;

            SELECT @@ROWCOUNT AS affectedRows;
        `);

    return Number(result.recordset?.[0]?.affectedRows || 0);
};

const getMyNotificationSummary = async ({ userId }) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('userId', sql.Int, userId)
        .query(`
            SELECT
                COUNT(1) AS totalCount,
                SUM(CASE WHEN isRead = 0 THEN 1 ELSE 0 END) AS unreadCount
            FROM dbo.Notifications
            WHERE userId = @userId;
        `);

    return {
        totalCount: Number(result.recordset?.[0]?.totalCount || 0),
        unreadCount: Number(result.recordset?.[0]?.unreadCount || 0),
    };
};

module.exports = {
    createNotification,
    getMyNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getMyNotificationSummary,
};
