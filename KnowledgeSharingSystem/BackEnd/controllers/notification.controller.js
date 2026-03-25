const notificationModel = require('../models/notification.model');

const getMyNotifications = async (req, res, next) => {
    try {
        const { isRead } = req.query;
        let parsedIsRead = null;

        if (isRead !== undefined) {
            if (isRead !== 'true' && isRead !== 'false') {
                const error = new Error("isRead must be 'true' or 'false'.");
                error.statusCode = 400;
                throw error;
            }

            parsedIsRead = isRead === 'true';
        }

        const notifications = await notificationModel.getMyNotifications({
            userId: req.user.userId,
            isRead: parsedIsRead,
        });

        res.json({
            success: true,
            message: 'Notifications fetched successfully.',
            data: notifications,
        });
    } catch (error) {
        next(error);
    }
};

const markNotificationAsRead = async (req, res, next) => {
    try {
        const notificationId = Number(req.params.id);

        if (!Number.isInteger(notificationId) || notificationId <= 0) {
            const error = new Error('A valid notification id is required.');
            error.statusCode = 400;
            throw error;
        }

        await notificationModel.markNotificationAsRead({
            notificationId,
            userId: req.user.userId,
        });

        res.json({
            success: true,
            message: 'Notification marked as read successfully.',
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMyNotifications,
    markNotificationAsRead,
};
