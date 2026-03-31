const pointEventModel = require('../models/point-event.model');
const notificationModel = require('../models/notification.model');

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

const reviewPointEvent = async (req, res, next) => {
    try {
        const eventId = Number(req.params.eventId);
        const { decision, note } = req.body;

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

        const reviewed = await pointEventModel.reviewPointEvent({
            eventId,
            reviewedByUserId: req.user.userId,
            decision,
            reviewNote: note || null,
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
                        ? `You received +${reviewed.points} points for ${reviewed.eventType}.`
                        : `Your point event (${reviewed.eventType}) was rejected.`,
                metadata: {
                    eventId: reviewed.eventId,
                    eventType: reviewed.eventType,
                    points: reviewed.points,
                    decision,
                    note: note || null,
                    userPointsAfter: reviewed.userPointsAfter,
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
    reviewPointEvent,
};
