const qaSessionModel = require('../../../models/qa-session.model');
const pointEventModel = require('../../../models/point-event.model');
const notificationModel = require('../../../models/notification.model');
const { notifyModerators } = require('../../../services/notification-dispatcher.service');
const qaRealtimeService = require('../../../services/qa-realtime.service');
const { getSuggestedPointsByStars } = require('../../../config/point-policy');
const { QA_SESSION_STATUSES } = require('../../../config/workflow-statuses');
const { VALIDATION_RULES } = require('../../../config/validation-rules');
const {
    normalizeOptionalText,
    normalizeRequiredText,
} = require('../../../utils/input-sanitizer');

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
            role: req.user.role,
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
        const questionSummary = normalizeOptionalText({
            value: req.body?.questionSummary,
            fieldName: 'questionSummary',
            maxLength: 2000,
        });
        const authorSolution = normalizeOptionalText({
            value: req.body?.authorSolution,
            fieldName: 'authorSolution',
            maxLength: 2000,
        });
        const satisfactionNote = normalizeOptionalText({
            value: req.body?.satisfactionNote,
            fieldName: 'satisfactionNote',
            maxLength: 2000,
        });
        const isSatisfied =
            typeof req.body?.isSatisfied === 'boolean'
                ? req.body.isSatisfied
                : null;

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
            questionSummary,
            authorSolution,
            satisfactionNote,
            isSatisfied,
        });

        const suggestedPoints = getSuggestedPointsByStars(stars);

        const pointEvent = await pointEventModel.createPointEvent({
            userId: rated.ownerUserId,
            eventType: pointEventModel.EVENT_TYPES.QA_SESSION_RATED,
            points: suggestedPoints,
            documentId: rated.documentId,
            qaSessionId: rated.sessionId,
            sourceUserId: rated.askerUserId,
            metadata: {
                sessionId: rated.sessionId,
                stars,
                feedback,
                feedbackId: rated.feedbackId || null,
                questionSummary,
                authorSolution,
                satisfactionNote,
                isSatisfied,
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

const reportMessage = async (req, res, next) => {
    try {
        const sessionId = Number(req.params.id);
        const messageId = Number(req.params.messageId);
        const reason = normalizeRequiredText({
            value: req.body?.reason,
            fieldName: 'reason',
            maxLength: 255,
        });

        if (!Number.isInteger(sessionId) || sessionId <= 0 || !Number.isInteger(messageId) || messageId <= 0) {
            const error = new Error('A valid session id and message id are required.');
            error.statusCode = 400;
            throw error;
        }

        const report = await qaSessionModel.reportMessage({
            sessionId,
            messageId,
            reporterUserId: req.user.userId,
            reason,
        });

        try {
            await notifyModerators({
                type: 'qa_message_reported',
                title: 'Q&A message reported',
                message: `A Q&A message in session #${sessionId} was reported.`,
                metadata: {
                    sessionId,
                    messageId,
                    reportId: report.reportId,
                    documentId: report.documentId,
                    action: 'qa.message_reported',
                    target: {
                        type: 'qa_message',
                        id: messageId,
                    },
                    route: `/qa-sessions/${sessionId}`,
                },
            });
        } catch (notifyError) {
            console.error('Failed to notify moderators about Q&A report:', notifyError.message);
        }

        res.status(201).json({
            success: true,
            message: 'Q&A message reported successfully.',
            data: report,
        });
    } catch (error) {
        next(error);
    }
};

const updateMessageModeration = async (req, res, next) => {
    try {
        const sessionId = Number(req.params.id);
        const messageId = Number(req.params.messageId);
        const action = String(req.body?.action || '').trim().toLowerCase();
        const note = normalizeOptionalText({
            value: req.body?.note,
            fieldName: 'note',
            maxLength: 255,
        });

        if (!Number.isInteger(sessionId) || sessionId <= 0 || !Number.isInteger(messageId) || messageId <= 0) {
            const error = new Error('A valid session id and message id are required.');
            error.statusCode = 400;
            throw error;
        }

        if (!['hide', 'restore'].includes(action)) {
            const error = new Error("action must be 'hide' or 'restore'.");
            error.statusCode = 400;
            throw error;
        }

        const message = await qaSessionModel.setMessageStatus({
            sessionId,
            messageId,
            moderatorUserId: req.user.userId,
            status: action === 'hide' ? 'hidden' : 'active',
            note: note || (action === 'hide' ? 'Hidden by moderator.' : 'Restored by moderator.'),
        });

        res.json({
            success: true,
            message: action === 'hide' ? 'Q&A message hidden successfully.' : 'Q&A message restored successfully.',
            data: message,
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
    reportMessage,
    updateMessageModeration,
};
