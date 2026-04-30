const pointEventModel = require('../models/point-event.model');
const notificationModel = require('../models/notification.model');
const { VALIDATION_RULES } = require('../config/validation-rules');
const { normalizeRequiredText, normalizeOptionalText } = require('../utils/input-sanitizer');

const getPendingPointEvents = async (req, res, next) => {
    try {
        const events = await pointEventModel.getPendingPointEvents();

        res.json({
            success: true,
            message: 'Pending point events fetched successfully.',
            data: events,
        });
    } catch (error) {
        next(error);
    }
};

const getReviewedQaRatingEvents = async (req, res, next) => {
    try {
        const limit = req.query.limit ? Number(req.query.limit) : 50;
        if (!Number.isInteger(limit) || limit <= 0) {
            const error = new Error('limit must be a positive integer.');
            error.statusCode = 400;
            throw error;
        }

        const events = await pointEventModel.getReviewedQaRatingEvents({ limit });

        res.json({
            success: true,
            message: 'Reviewed Q&A rating events fetched successfully.',
            data: events,
        });
    } catch (error) {
        next(error);
    }
};

const deleteQaRatingEvent = async (req, res, next) => {
    try {
        const eventId = Number(req.params.eventId);
        const note = normalizeOptionalText({
            value: req.body?.note,
            fieldName: 'note',
            maxLength: VALIDATION_RULES.document.moderationNoteMax,
        });

        if (!Number.isInteger(eventId) || eventId <= 0) {
            const error = new Error('A valid Q&A rating event id is required.');
            error.statusCode = 400;
            throw error;
        }

        const deleted = await pointEventModel.deleteQaRatingEvent({
            eventId,
            deletedByUserId: req.user.userId,
            deleteNote: note || null,
        });

        res.json({
            success: true,
            message: 'Q&A rating deleted successfully.',
            data: deleted,
        });
    } catch (error) {
        next(error);
    }
};

const reviewPointEvent = async (req, res, next) => {
    try {
        const eventId = Number(req.params.eventId);
        const decision = normalizeRequiredText({
            value: req.body?.decision,
            fieldName: 'decision',
            maxLength: 20,
        }).toLowerCase();
        const note = normalizeOptionalText({
            value: req.body?.note,
            fieldName: 'note',
            maxLength: VALIDATION_RULES.document.moderationNoteMax,
        });
        const { pointDelta } = req.body || {};

        if (!Number.isInteger(eventId) || eventId <= 0) {
            const error = new Error('A valid point event id is required.');
            error.statusCode = 400;
            throw error;
        }

        if (!['approved', 'rejected'].includes(decision)) {
            const error = new Error("decision must be either 'approved' or 'rejected'.");
            error.statusCode = 400;
            throw error;
        }

        let parsedPointDelta = null;
        if (typeof pointDelta !== 'undefined' && pointDelta !== null && pointDelta !== '') {
            parsedPointDelta = Number(pointDelta);
            if (!Number.isInteger(parsedPointDelta)) {
                const error = new Error('pointDelta must be an integer.');
                error.statusCode = 400;
                throw error;
            }
        }

        const reviewed = await pointEventModel.reviewPointEvent({
            eventId,
            reviewedByUserId: req.user.userId,
            decision,
            reviewNote: note || null,
            pointDeltaOverride: decision === 'approved' ? parsedPointDelta : null,
        });

        try {
            await notificationModel.createNotification({
                userId: reviewed.userId,
                type: decision === 'approved' ? 'point_event_approved' : 'point_event_rejected',
                title:
                    decision === 'approved'
                        ? 'Points approved'
                        : 'Point event rejected',
                message:
                    decision === 'approved'
                        ? `Your point event (${reviewed.eventType}) was approved with ${reviewed.approvedPoints} point(s).`
                        : `Your point event (${reviewed.eventType}) was rejected.`,
                metadata: {
                    eventId: reviewed.eventId,
                    eventType: reviewed.eventType,
                    points: reviewed.points,
                    approvedPoints: reviewed.approvedPoints,
                    decision,
                    note: note || null,
                    userPointsAfter: reviewed.userPointsAfter,
                    action: decision === 'approved' ? 'point.approved' : 'point.rejected',
                    target: {
                        type: 'point_event',
                        id: reviewed.eventId,
                    },
                    route: '/points',
                },
            });
        } catch (notifyError) {
            console.error('Failed to notify user after point-event review:', notifyError.message);
        }

        res.json({
            success: true,
            message: 'Point event reviewed successfully.',
            data: reviewed,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPendingPointEvents,
    getReviewedQaRatingEvents,
    deleteQaRatingEvent,
    reviewPointEvent,
};
