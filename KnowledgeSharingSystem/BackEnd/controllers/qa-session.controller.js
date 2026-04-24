const qaSessionModel = require('../models/qa-session.model');
const pointEventModel = require('../models/point-event.model');
const notificationModel = require('../models/notification.model');
const { notifyModerators } = require('../services/notification-dispatcher.service');
const qaRealtimeService = require('../services/qa-realtime.service');
const { getSuggestedPointsByStars } = require('../config/point-policy');
const { QA_SESSION_STATUSES } = require('../config/workflow-statuses');
const { VALIDATION_RULES } = require('../config/validation-rules');
const {
    normalizeOptionalText,
    normalizeRequiredText,
} = require('../utils/input-sanitizer');

const createSession = async (req, res, next) => {
    try {
        const documentId = Number(req.body.documentId);
        const initialMessage = normalizeOptionalText({
            value: req.body?.initialMessage,
            fieldName: 'Initial message',
            maxLength: VALIDATION_RULES.qa.initialMessageMax,
        });

        if (!Number.isInteger(documentId) || documentId <= 0) {
            const error = new Error('A valid document id is required.');
            error.statusCode = 400;
            throw error;
        }

        const session = await qaSessionModel.createSession({
            documentId,
            askerUserId: req.user.userId,
            initialMessage,
        });

        try {
            await notificationModel.createNotification({
                userId: session.ownerUserId,
                type: 'qa_session_opened',
                title: 'New Q&A request',
                message: `You have a new question for document "${session.documentTitle}".`,
                metadata: {
                    sessionId: session.sessionId,
                    documentId: session.documentId,
                    askerUserId: session.askerUserId,
                    action: 'qa.opened',
                    target: {
                        type: 'qa_session',
                        id: session.sessionId,
                    },
                    route: `/qa-sessions/${session.sessionId}`,
                },
            });
        } catch (notifyError) {
            console.error('Failed to notify owner about new Q&A session:', notifyError.message);
        }

        res.status(201).json({
            success: true,
            message: 'Q&A session created successfully.',
            data: session,
        });
    } catch (error) {
        next(error);
    }
};

const getMySessions = async (req, res, next) => {
    try {
        const { status } = req.query;
        let parsedStatus = null;
        const allowedStatuses = Object.values(QA_SESSION_STATUSES);

        if (typeof status !== 'undefined' && status !== null && status !== '') {
            if (!allowedStatuses.includes(String(status))) {
                const error = new Error(
                    `status must be one of '${allowedStatuses.join("', '")}'.`
                );
                error.statusCode = 400;
                throw error;
            }
            parsedStatus = String(status);
        }

        const sessions = await qaSessionModel.getMySessions({
            userId: req.user.userId,
            status: parsedStatus,
        });

        res.json({
            success: true,
            message: 'Q&A sessions fetched successfully.',
            data: sessions,
        });
    } catch (error) {
        next(error);
    }
};

const getSessionMessages = async (req, res, next) => {
    try {
        const sessionId = Number(req.params.id);

        if (!Number.isInteger(sessionId) || sessionId <= 0) {
            const error = new Error('A valid session id is required.');
            error.statusCode = 400;
            throw error;
        }

        const data = await qaSessionModel.getSessionMessages({
            sessionId,
            userId: req.user.userId,
        });

        res.json({
            success: true,
            message: 'Q&A messages fetched successfully.',
            data,
        });
    } catch (error) {
        next(error);
    }
};

const sendMessage = async (req, res, next) => {
    try {
        const sessionId = Number(req.params.id);
        const message = normalizeRequiredText({
            value: req.body?.message,
            fieldName: 'message',
            maxLength: VALIDATION_RULES.qa.messageMax,
        });

        if (!Number.isInteger(sessionId) || sessionId <= 0) {
            const error = new Error('A valid session id is required.');
            error.statusCode = 400;
            throw error;
        }

        const result = await qaSessionModel.addSessionMessage({
            sessionId,
            senderUserId: req.user.userId,
            message,
        });

        const receiverUserId =
            result.session.askerUserId === req.user.userId
                ? result.session.ownerUserId
                : result.session.askerUserId;

        try {
            await notificationModel.createNotification({
                userId: receiverUserId,
                type: 'qa_session_message',
                title: 'New Q&A message',
                message: 'You received a new message in a Q&A session.',
                metadata: {
                    sessionId,
                    messageId: result.message.messageId,
                    senderUserId: req.user.userId,
                    action: 'qa.message',
                    target: {
                        type: 'qa_session',
                        id: sessionId,
                    },
                    route: `/qa-sessions/${sessionId}`,
                },
            });
        } catch (notifyError) {
            console.error('Failed to notify new Q&A message:', notifyError.message);
        }

        qaRealtimeService.broadcastToSession({
            sessionId,
            participantUserIds: [result.session.askerUserId, result.session.ownerUserId],
            event: 'qa_message_created',
            data: {
                message: result.message,
            },
        });

        res.status(201).json({
            success: true,
            message: 'Message sent successfully.',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

const closeSession = async (req, res, next) => {
    try {
        const sessionId = Number(req.params.id);

        if (!Number.isInteger(sessionId) || sessionId <= 0) {
            const error = new Error('A valid session id is required.');
            error.statusCode = 400;
            throw error;
        }

        const session = await qaSessionModel.closeSession({
            sessionId,
            closedByUserId: req.user.userId,
        });

        const receiverUserId =
            session.askerUserId === req.user.userId ? session.ownerUserId : session.askerUserId;

        try {
            await notificationModel.createNotification({
                userId: receiverUserId,
                type: 'qa_session_closed',
                title: 'Q&A session closed',
                message: 'A Q&A session has been closed.',
                metadata: {
                    sessionId: session.sessionId,
                    documentId: session.documentId,
                    closedByUserId: req.user.userId,
                    action: 'qa.closed',
                    target: {
                        type: 'qa_session',
                        id: session.sessionId,
                    },
                    route: `/qa-sessions/${session.sessionId}`,
                },
            });
        } catch (notifyError) {
            console.error('Failed to notify Q&A close:', notifyError.message);
        }

        qaRealtimeService.broadcastToSession({
            sessionId: session.sessionId,
            participantUserIds: [session.askerUserId, session.ownerUserId],
            event: 'qa_session_closed',
            data: {
                closedByUserId: req.user.userId,
                closedAt: session.closedAt,
                status: session.status,
            },
        });

        res.json({
            success: true,
            message: 'Q&A session closed successfully.',
            data: session,
        });
    } catch (error) {
        next(error);
    }
};

const rateSession = async (req, res, next) => {
    try {
        const sessionId = Number(req.params.id);
        const stars = Number(req.body.stars);
        const feedback = normalizeOptionalText({
            value: req.body?.feedback,
            fieldName: 'feedback',
            maxLength: VALIDATION_RULES.qa.feedbackMax,
        });

        if (!Number.isInteger(sessionId) || sessionId <= 0) {
            const error = new Error('A valid session id is required.');
            error.statusCode = 400;
            throw error;
        }

        if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
            const error = new Error('stars must be an integer between 1 and 5.');
            error.statusCode = 400;
            throw error;
        }

        const rated = await qaSessionModel.rateSession({
            sessionId,
            askerUserId: req.user.userId,
            stars,
            feedback,
        });

        const suggestedPoints = getSuggestedPointsByStars(stars);

        const pointEvent = await pointEventModel.createPointEvent({
            userId: rated.ownerUserId,
            eventType: pointEventModel.EVENT_TYPES.QA_SESSION_RATED,
            points: suggestedPoints,
            documentId: rated.documentId,
            qaSessionId: rated.sessionId,
            metadata: {
                sessionId: rated.sessionId,
                stars,
                feedback,
                askedByUserId: rated.askerUserId,
                suggestedPoints,
            },
        });

        try {
            await notifyModerators({
                type: 'qa_rating_pending_review',
                title: 'Q&A rating pending point review',
                message: `Session #${rated.sessionId} was rated ${stars} star(s).`,
                metadata: {
                    sessionId: rated.sessionId,
                    documentId: rated.documentId,
                    stars,
                    pointEventId: pointEvent?.eventId || null,
                    suggestedPoints,
                    action: 'qa.rating_pending_review',
                    target: {
                        type: 'moderation_queue',
                        id: rated.sessionId,
                    },
                    route: `/moderation?qaSessionId=${rated.sessionId}`,
                },
            });
        } catch (notifyError) {
            console.error('Failed to notify moderation for Q&A rating:', notifyError.message);
        }

        res.status(201).json({
            success: true,
            message: 'Q&A session rated successfully. Point event is pending moderation review.',
            data: {
                ...rated,
                suggestedPoints,
                pointEvent,
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createSession,
    getMySessions,
    getSessionMessages,
    sendMessage,
    closeSession,
    rateSession,
};
