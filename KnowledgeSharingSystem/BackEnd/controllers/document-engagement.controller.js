const documentEngagementModel = require('../models/document-engagement.model');
const pointEventModel = require('../models/point-event.model');
const { POINT_POLICY } = require('../config/point-policy');
const {
    notifyModerators,
    notifyUserIfDifferent,
} = require('../services/notification-dispatcher.service');
const actorLabel = (user) => user?.name || user?.username || 'A user';

const validateDocumentId = (id) => {
    const documentId = Number(id);

    if (!Number.isInteger(documentId) || documentId <= 0) {
        const error = new Error('A valid document id is required.');
        error.statusCode = 400;
        throw error;
    }

    return documentId;
};

const ensureDocumentCanInteract = async (documentId) => {
    const document = await documentEngagementModel.getDocumentForEngagement(documentId);

    if (!document) {
        const error = new Error('Document not found.');
        error.statusCode = 404;
        throw error;
    }

    if (document.status !== 'approved') {
        const error = new Error('Only approved documents can be interacted with.');
        error.statusCode = 400;
        throw error;
    }

    return document;
};

const getEngagement = async (req, res, next) => {
    try {
        const documentId = validateDocumentId(req.params.id);
        const document = await ensureDocumentCanInteract(documentId);

        const engagement = await documentEngagementModel.getDocumentEngagement({
            documentId,
            userId: req.user.userId,
        });

        res.json({
            success: true,
            message: 'Document engagement fetched successfully.',
            data: {
                documentId,
                ...engagement,
            },
        });
    } catch (error) {
        next(error);
    }
};

const updateReaction = async (req, res, next) => {
    try {
        const documentId = validateDocumentId(req.params.id);
        const { reactionType } = req.body;

        if (![null, undefined, '', 'like', 'dislike'].includes(reactionType)) {
            const error = new Error("reactionType must be 'like', 'dislike', or null.");
            error.statusCode = 400;
            throw error;
        }

        const document = await ensureDocumentCanInteract(documentId);
        const previousEngagement = await documentEngagementModel.getDocumentEngagement({
            documentId,
            userId: req.user.userId,
        });

        const normalizedReactionType =
            reactionType === '' || reactionType === undefined ? null : reactionType;

        await documentEngagementModel.upsertReaction({
            documentId,
            userId: req.user.userId,
            reactionType: normalizedReactionType,
        });

        try {
            if (normalizedReactionType) {
                const actionText = normalizedReactionType === 'like' ? 'liked' : 'disliked';
                await notifyUserIfDifferent({
                    actorUserId: req.user.userId,
                    receiverUserId: document.ownerUserId,
                    type: `document_${normalizedReactionType}d`,
                    title: `Your document received a ${normalizedReactionType}`,
                    message: `${actorLabel(req.user)} ${actionText} your document "${document.title}".`,
                    metadata: {
                        documentId,
                        reactorUserId: req.user.userId,
                        reactionType: normalizedReactionType,
                        action: normalizedReactionType === 'like' ? 'document.liked' : 'document.disliked',
                        target: {
                            type: 'document',
                            id: documentId,
                        },
                        route: `/documents/${documentId}`,
                    },
                });

                if (
                    normalizedReactionType === 'like' &&
                    previousEngagement.currentReaction !== 'like' &&
                    Number(document.ownerUserId) !== Number(req.user.userId)
                ) {
                    const pointEvent = await pointEventModel.createPointEvent({
                        userId: document.ownerUserId,
                        eventType: pointEventModel.EVENT_TYPES.UPVOTE_RECEIVED,
                        points: Number(POINT_POLICY.rewards.upvoteReceived || 0),
                        documentId,
                        sourceUserId: req.user.userId,
                        metadata: {
                            documentId,
                            reactorUserId: req.user.userId,
                            source: 'document_like',
                        },
                    });

                    if (pointEvent?.eventId) {
                        await notifyModerators({
                            type: 'point_event_pending_review',
                            title: 'Point event pending review',
                            message: `Document like created a pending point event (eventId=${pointEvent.eventId}).`,
                            metadata: {
                                eventId: pointEvent.eventId,
                                eventType: pointEventModel.EVENT_TYPES.UPVOTE_RECEIVED,
                                documentId,
                                userId: document.ownerUserId,
                                action: 'point.pending',
                                target: {
                                    type: 'moderation_queue',
                                    id: pointEvent.eventId,
                                },
                                route: `/moderation?documentId=${documentId}&eventId=${pointEvent.eventId}`,
                            },
                        });
                    }
                }
            }
        } catch (notifyError) {
            console.error('Failed to create reaction notification:', notifyError.message);
        }

        const engagement = await documentEngagementModel.getDocumentEngagement({
            documentId,
            userId: req.user.userId,
        });

        res.json({
            success: true,
            message: normalizedReactionType
                ? 'Reaction updated successfully.'
                : 'Reaction removed successfully.',
            data: {
                documentId,
                ...engagement,
            },
        });
    } catch (error) {
        next(error);
    }
};

const updateSavedState = async (req, res, next) => {
    try {
        const documentId = validateDocumentId(req.params.id);
        const { isSaved } = req.body;

        if (typeof isSaved !== 'boolean') {
            const error = new Error('isSaved must be boolean.');
            error.statusCode = 400;
            throw error;
        }

        const document = await ensureDocumentCanInteract(documentId);
        const previousEngagement = await documentEngagementModel.getDocumentEngagement({
            documentId,
            userId: req.user.userId,
        });

        await documentEngagementModel.setSavedDocument({
            documentId,
            userId: req.user.userId,
            isSaved,
        });

        const engagement = await documentEngagementModel.getDocumentEngagement({
            documentId,
            userId: req.user.userId,
        });

        if (
            isSaved === true &&
            previousEngagement.isSaved === false &&
            Number(document.ownerUserId) !== Number(req.user.userId)
        ) {
            try {
                const pointEvent = await pointEventModel.createPointEvent({
                    userId: document.ownerUserId,
                    eventType: pointEventModel.EVENT_TYPES.DOCUMENT_SAVED_BY_OTHER,
                    points: Number(POINT_POLICY.rewards.documentSavedByOther || 0),
                    documentId,
                    sourceUserId: req.user.userId,
                    metadata: {
                        documentId,
                        saverUserId: req.user.userId,
                        source: 'document_save',
                    },
                });

                await notifyUserIfDifferent({
                    actorUserId: req.user.userId,
                    receiverUserId: document.ownerUserId,
                    type: 'document_saved',
                    title: 'Your document was saved',
                    message: `${actorLabel(req.user)} saved your document "${document.title}".`,
                    metadata: {
                        documentId,
                        saverUserId: req.user.userId,
                        action: 'document.saved',
                        target: {
                            type: 'document',
                            id: documentId,
                        },
                        route: `/documents/${documentId}`,
                    },
                });

                if (pointEvent?.eventId) {
                    await notifyModerators({
                        type: 'point_event_pending_review',
                        title: 'Point event pending review',
                        message: `Document save created a pending point event (eventId=${pointEvent.eventId}).`,
                        metadata: {
                            eventId: pointEvent.eventId,
                            eventType: pointEventModel.EVENT_TYPES.DOCUMENT_SAVED_BY_OTHER,
                            documentId,
                            userId: document.ownerUserId,
                            action: 'point.pending',
                            target: {
                                type: 'moderation_queue',
                                id: pointEvent.eventId,
                            },
                            route: `/moderation?documentId=${documentId}&eventId=${pointEvent.eventId}`,
                        },
                    });
                }
            } catch (notifyError) {
                console.error('Failed to create save notification/point event:', notifyError.message);
            }
        }

        res.json({
            success: true,
            message: isSaved ? 'Document saved successfully.' : 'Document unsaved successfully.',
            data: {
                documentId,
                ...engagement,
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getEngagement,
    updateReaction,
    updateSavedState,
};
