const commentModel = require('../models/comment.model');
const pointEventModel = require('../models/point-event.model');
const {
    notifyModerators,
    notifyUserIfDifferent,
} = require('../services/notification-dispatcher.service');
const { POINT_POLICY } = require('../config/point-policy');
const { COMMENT_STATUSES } = require('../config/workflow-statuses');
const { VALIDATION_RULES } = require('../config/validation-rules');
const {
    normalizeRequiredText,
    normalizeOptionalText,
} = require('../utils/input-sanitizer');

const actorLabel = (user) => user?.name || user?.username || 'A user';

const enforceCommentRateLimit = async (userId) => {
    const recentCount = await commentModel.countRecentCommentsByUser({
        userId,
        windowSeconds: POINT_POLICY.commentAntiSpam.windowSeconds,
    });

    if (recentCount >= POINT_POLICY.commentAntiSpam.maxCommentsInWindow) {
        const error = new Error(
            `Too many comments in a short time. Please wait ${POINT_POLICY.commentAntiSpam.windowSeconds} seconds and try again.`
        );
        error.statusCode = 429;
        throw error;
    }
};

const createPointEventSafe = async (payload) => {
    try {
        return await pointEventModel.createPointEvent(payload);
    } catch (pointError) {
        console.error('Failed to create point event:', pointError.message);
        return null;
    }
};

const getDocumentComments = async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);

        if (!Number.isInteger(documentId) || documentId <= 0) {
            const error = new Error('A valid document id is required.');
            error.statusCode = 400;
            throw error;
        }

        const comments = await commentModel.getCommentsByDocumentId({
            documentId,
            includeHidden: false,
            viewerUserId: req.user?.userId || null,
            viewerRole: req.user?.role || null,
        });

        res.json({
            success: true,
            message: 'Comments fetched successfully.',
            data: comments,
        });
    } catch (error) {
        next(error);
    }
};

const createComment = async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const content = normalizeRequiredText({
            value: req.body?.content,
            fieldName: 'Comment content',
            maxLength: VALIDATION_RULES.comment.contentMax,
        });

        if (!Number.isInteger(documentId) || documentId <= 0) {
            const error = new Error('A valid document id is required.');
            error.statusCode = 400;
            throw error;
        }

        await enforceCommentRateLimit(req.user.userId);

        const commentId = await commentModel.createComment({
            documentId,
            authorUserId: req.user.userId,
            content,
        });

        const createdComment = await commentModel.getCommentById(commentId);

        try {
            const documentInfo = await commentModel.getDocumentOwnerForComments(documentId);

            if (documentInfo) {
                await notifyModerators({
                    type: 'comment_pending_moderation',
                    title: 'Comment pending moderation',
                    message: `${actorLabel(req.user)} submitted a comment on "${documentInfo.documentTitle}".`,
                    metadata: {
                        documentId,
                        commentId,
                        authorUserId: req.user.userId,
                        status: 'pending',
                        action: 'comment.pending_moderation',
                        target: {
                            type: 'moderation_queue',
                            id: commentId,
                        },
                        route: `/moderation?documentId=${documentId}&commentId=${commentId}`,
                    },
                });
            }
        } catch (notifyError) {
            console.error('Failed to create comment notifications:', notifyError.message);
        }

        res.status(201).json({
            success: true,
            message: 'Comment submitted and is pending moderation.',
            data: createdComment,
        });
    } catch (error) {
        if (error.number === 55301) {
            error.statusCode = 400;
        }
        next(error);
    }
};

const createReplyComment = async (req, res, next) => {
    try {
        const parentCommentId = Number(req.params.id);
        const content = normalizeRequiredText({
            value: req.body?.content,
            fieldName: 'Reply content',
            maxLength: VALIDATION_RULES.comment.contentMax,
        });

        if (!Number.isInteger(parentCommentId) || parentCommentId <= 0) {
            const error = new Error('A valid parent comment id is required.');
            error.statusCode = 400;
            throw error;
        }

        await enforceCommentRateLimit(req.user.userId);

        const commentId = await commentModel.createReplyComment({
            parentCommentId,
            authorUserId: req.user.userId,
            content,
        });

        const createdReply = await commentModel.getCommentById(commentId);

        try {
            const documentInfo = createdReply?.documentId
                ? await commentModel.getDocumentOwnerForComments(createdReply.documentId)
                : null;

            if (documentInfo) {
                await notifyModerators({
                    type: 'comment_reply_pending_moderation',
                    title: 'Reply pending moderation',
                    message: `${actorLabel(req.user)} submitted a reply in "${documentInfo.documentTitle}".`,
                    metadata: {
                        documentId: documentInfo.documentId,
                        parentCommentId,
                        replyCommentId: commentId,
                        authorUserId: req.user.userId,
                        status: 'pending',
                        action: 'comment.reply_pending_moderation',
                        target: {
                            type: 'moderation_queue',
                            id: commentId,
                        },
                        route: `/moderation?documentId=${documentInfo.documentId}&commentId=${commentId}`,
                    },
                });
            }
        } catch (notifyError) {
            console.error('Failed to create reply notifications:', notifyError.message);
        }

        res.status(201).json({
            success: true,
            message: 'Reply submitted and is pending moderation.',
            data: createdReply,
        });
    } catch (error) {
        if (error.number === 57101) {
            error.statusCode = 404;
        }

        if (error.number === 57102 || error.number === 57103) {
            error.statusCode = 400;
        }

        next(error);
    }
};

const getPendingCommentsForModeration = async (req, res, next) => {
    try {
        const limit = req.query.limit ? Number(req.query.limit) : 100;
        const offset = req.query.offset ? Number(req.query.offset) : 0;
        const documentId = req.query.documentId ? Number(req.query.documentId) : null;

        if (!Number.isInteger(limit) || limit <= 0) {
            const error = new Error('limit must be a positive integer.');
            error.statusCode = 400;
            throw error;
        }

        if (!Number.isInteger(offset) || offset < 0) {
            const error = new Error('offset must be a non-negative integer.');
            error.statusCode = 400;
            throw error;
        }

        if (documentId !== null && (!Number.isInteger(documentId) || documentId <= 0)) {
            const error = new Error('documentId must be a positive integer.');
            error.statusCode = 400;
            throw error;
        }

        const comments = await commentModel.getPendingCommentsForModeration({
            limit,
            offset,
            documentId,
        });

        res.json({
            success: true,
            message: 'Pending comments fetched successfully.',
            data: comments,
        });
    } catch (error) {
        next(error);
    }
};

const reviewComment = async (req, res, next) => {
    try {
        const commentId = Number(req.params.id);
        const decision = normalizeRequiredText({
            value: req.body?.decision,
            fieldName: 'decision',
            maxLength: 20,
        }).toLowerCase();
        const note = normalizeOptionalText({
            value: req.body?.note,
            fieldName: 'note',
            maxLength: VALIDATION_RULES.comment.moderationNoteMax,
        });
        const reviewableStatuses = [
            COMMENT_STATUSES.APPROVED,
            COMMENT_STATUSES.REJECTED,
        ];

        if (!Number.isInteger(commentId) || commentId <= 0) {
            const error = new Error('A valid comment id is required.');
            error.statusCode = 400;
            throw error;
        }

        if (!reviewableStatuses.includes(decision)) {
            const error = new Error(
                `decision must be one of '${reviewableStatuses.join("', '")}'.`
            );
            error.statusCode = 400;
            throw error;
        }

        const existingComment = await commentModel.getCommentById(commentId);
        if (!existingComment) {
            const error = new Error('Comment not found.');
            error.statusCode = 404;
            throw error;
        }

        if (existingComment.status !== COMMENT_STATUSES.PENDING) {
            const error = new Error('Only pending comments can be reviewed.');
            error.statusCode = 400;
            throw error;
        }

        const affectedRows = await commentModel.reviewCommentStatus({
            commentId,
            decision,
            reviewerUserId: req.user.userId,
            reviewNote: note,
        });

        if (!affectedRows) {
            const error = new Error('Comment review failed. Please retry.');
            error.statusCode = 500;
            throw error;
        }

        const reviewedComment = await commentModel.getCommentById(commentId);
        const pendingPointEventIds = [];

        try {
            await notifyUserIfDifferent({
                actorUserId: req.user.userId,
                receiverUserId: reviewedComment.authorUserId,
                type: decision === 'approved' ? 'comment_approved' : 'comment_rejected',
                title: decision === 'approved' ? 'Comment approved' : 'Comment rejected',
                message:
                    decision === 'approved'
                        ? 'Your comment was approved by moderation. Point rewards are pending point moderation review.'
                        : 'Your comment was rejected by moderation.',
                metadata: {
                    commentId,
                    documentId: reviewedComment.documentId,
                    decision,
                    note,
                    action: decision === 'approved' ? 'comment.approved' : 'comment.rejected',
                    target: {
                        type: 'comment',
                        id: commentId,
                    },
                    route: `/documents/${reviewedComment.documentId}?commentId=${commentId}`,
                },
            });

            if (decision === 'approved') {
                const commenterPointEvent = await createPointEventSafe({
                    userId: reviewedComment.authorUserId,
                    eventType: pointEventModel.EVENT_TYPES.COMMENT_GIVEN,
                    points: POINT_POLICY.rewards.commentGiven,
                    documentId: reviewedComment.documentId,
                    commentId,
                    metadata: {
                        source: reviewedComment.parentCommentId ? 'comment_reply' : 'document_comment',
                        commentId,
                        approvedByCommentReviewerUserId: req.user.userId,
                    },
                });
                if (commenterPointEvent?.eventId) {
                    pendingPointEventIds.push(Number(commenterPointEvent.eventId));
                }

                const rewardTarget = await commentModel.getCommentRewardTargetUserId(commentId);
                if (
                    rewardTarget &&
                    Number(rewardTarget.targetUserId) !== Number(reviewedComment.authorUserId)
                ) {
                    const targetPointEvent = await createPointEventSafe({
                        userId: rewardTarget.targetUserId,
                        eventType: pointEventModel.EVENT_TYPES.COMMENT_RECEIVED,
                        points: POINT_POLICY.rewards.commentReceived,
                        documentId: reviewedComment.documentId,
                        commentId,
                        sourceUserId: reviewedComment.authorUserId,
                        metadata: {
                            source: reviewedComment.parentCommentId ? 'comment_reply' : 'document_comment',
                            commentId,
                            fromUserId: reviewedComment.authorUserId,
                            approvedByCommentReviewerUserId: req.user.userId,
                        },
                    });
                    if (targetPointEvent?.eventId) {
                        pendingPointEventIds.push(Number(targetPointEvent.eventId));
                    }

                    await notifyUserIfDifferent({
                        actorUserId: reviewedComment.authorUserId,
                        receiverUserId: rewardTarget.targetUserId,
                        type: reviewedComment.parentCommentId
                            ? 'comment_reply_approved'
                            : 'document_comment_approved',
                        title: reviewedComment.parentCommentId
                            ? 'New approved reply'
                            : 'New approved comment',
                        message: reviewedComment.parentCommentId
                            ? `${actorLabel({ name: reviewedComment.authorName })} replied to your comment.`
                            : `${actorLabel({ name: reviewedComment.authorName })} commented on your document.`,
                        metadata: {
                            commentId,
                            documentId: reviewedComment.documentId,
                            parentCommentId: reviewedComment.parentCommentId,
                            action: reviewedComment.parentCommentId
                                ? 'comment.reply_approved'
                                : 'comment.document_approved',
                            target: {
                                type: 'comment',
                                id: commentId,
                            },
                            route: `/documents/${reviewedComment.documentId}?commentId=${commentId}`,
                        },
                    });

                    await notifyModerators({
                        type: 'comment_points_pending_review',
                        title: 'Comment points pending review',
                        message: `Comment #${commentId} generated point events pending moderation review.`,
                        metadata: {
                            documentId: reviewedComment.documentId,
                            commentId,
                            pointEventIds: pendingPointEventIds,
                            action: 'point.pending_from_comment',
                            target: {
                                type: 'moderation_queue',
                                id: commentId,
                            },
                            route: `/moderation?documentId=${reviewedComment.documentId}&commentId=${commentId}`,
                        },
                    });
                } else if (commenterPointEvent?.eventId) {
                    await notifyModerators({
                        type: 'comment_points_pending_review',
                        title: 'Comment points pending review',
                        message: `Comment #${commentId} generated point events pending moderation review.`,
                        metadata: {
                            documentId: reviewedComment.documentId,
                            commentId,
                            pointEventIds: pendingPointEventIds,
                            action: 'point.pending_from_comment',
                            target: {
                                type: 'moderation_queue',
                                id: commentId,
                            },
                            route: `/moderation?documentId=${reviewedComment.documentId}&commentId=${commentId}`,
                        },
                    });
                }
            }
        } catch (notifyError) {
            console.error('Failed to send comment review notifications:', notifyError.message);
        }

        const pointReviewInfo =
            decision === 'approved'
                ? {
                    pendingReview: true,
                    pointEventIds: pendingPointEventIds,
                }
                : {
                    pendingReview: false,
                    pointEventIds: [],
                };

        res.json({
            success: true,
            message:
                decision === 'approved'
                    ? 'Comment approved successfully. Point rewards are pending moderator review.'
                    : 'Comment rejected successfully.',
            data: {
                ...reviewedComment,
                pointReview: pointReviewInfo,
            },
        });
    } catch (error) {
        next(error);
    }
};

const hideComment = async (req, res, next) => {
    try {
        const commentId = Number(req.params.id);

        if (!Number.isInteger(commentId) || commentId <= 0) {
            const error = new Error('A valid comment id is required.');
            error.statusCode = 400;
            throw error;
        }

        const existingComment = await commentModel.getCommentById(commentId);

        if (!existingComment) {
            const error = new Error('Comment not found.');
            error.statusCode = 404;
            throw error;
        }

        await commentModel.updateCommentStatus({
            commentId,
            status: 'hidden',
        });

        const updatedComment = await commentModel.getCommentById(commentId);

        res.json({
            success: true,
            message: 'Comment hidden successfully.',
            data: updatedComment,
        });
    } catch (error) {
        next(error);
    }
};

const deleteComment = async (req, res, next) => {
    try {
        const commentId = Number(req.params.id);

        if (!Number.isInteger(commentId) || commentId <= 0) {
            const error = new Error('A valid comment id is required.');
            error.statusCode = 400;
            throw error;
        }

        const existingComment = await commentModel.getCommentById(commentId);

        if (!existingComment) {
            const error = new Error('Comment not found.');
            error.statusCode = 404;
            throw error;
        }

        const isOwner = existingComment.authorUserId === req.user.userId;
        const isPrivileged = ['admin', 'moderator'].includes(req.user.role);

        if (!isOwner && !isPrivileged) {
            const error = new Error('You do not have permission to delete this comment.');
            error.statusCode = 403;
            throw error;
        }

        await commentModel.updateCommentStatus({
            commentId,
            status: 'hidden',
        });

        res.json({
            success: true,
            message: 'Comment deleted successfully.',
            data: {
                commentId,
                status: 'hidden',
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDocumentComments,
    createComment,
    createReplyComment,
    getPendingCommentsForModeration,
    reviewComment,
    hideComment,
    deleteComment,
};
