const notificationModel = require('../models/notification.model');
const jwt = require('jsonwebtoken');
const notificationStream = require('../services/notification-stream.service');

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
            data: {
                notificationId,
                isRead: true,
            },
        });
    } catch (error) {
        next(error);
    }
};

const markAllNotificationsAsRead = async (req, res, next) => {
    try {
        const affectedRows = await notificationModel.markAllNotificationsAsRead({
            userId: req.user.userId,
        });

        res.json({
            success: true,
            message: 'All notifications marked as read successfully.',
            data: {
                affectedRows,
            },
        });
    } catch (error) {
        next(error);
    }
};

const getMyNotificationSummary = async (req, res, next) => {
    try {
        const summary = await notificationModel.getMyNotificationSummary({
            userId: req.user.userId,
        });

        res.json({
            success: true,
            message: 'Notification summary fetched successfully.',
            data: summary,
        });
    } catch (error) {
        next(error);
    }
};

const streamNotifications = async (req, res, next) => {
    try {
        const tokenFromQuery = req.query?.token ? String(req.query.token) : '';
        const tokenFromHeader = req.headers.authorization?.startsWith('Bearer ')
            ? req.headers.authorization.split(' ')[1]
            : '';

        const token = tokenFromQuery || tokenFromHeader;

        if (!token) {
            const error = new Error('Authorization token is required for notification stream.');
            error.statusCode = 401;
            throw error;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = Number(decoded.userId);

        if (!Number.isInteger(userId) || userId <= 0) {
            const error = new Error('Invalid token payload for notification stream.');
            error.statusCode = 401;
            throw error;
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();

        notificationStream.subscribe({ userId, res });

        res.write(
            `data: ${JSON.stringify({
                event: 'stream_connected',
                data: { userId, connectedAt: new Date().toISOString() },
            })}\n\n`
        );

        const heartbeat = setInterval(() => {
            if (!res.writableEnded && !res.destroyed) {
                res.write(': ping\n\n');
            }
        }, 30000);

        req.on('close', () => {
            clearInterval(heartbeat);
            notificationStream.unsubscribe({ userId, res });
            if (!res.writableEnded) {
                res.end();
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMyNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getMyNotificationSummary,
    streamNotifications,
};
