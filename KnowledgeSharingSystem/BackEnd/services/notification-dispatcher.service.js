const notificationModel = require('../models/notification.model');
const userModel = require('../models/user.model');

const notifyModerators = async ({ type, title, message, metadata = null }) => {
    const moderators = await userModel.getActiveModeratorsAndAdmins();

    if (!moderators.length) {
        return 0;
    }

    await Promise.all(
        moderators.map((moderator) =>
            notificationModel.createNotification({
                userId: moderator.userId,
                type,
                title,
                message,
                metadata,
            })
        )
    );

    return moderators.length;
};

const notifyUserIfDifferent = async ({
    actorUserId,
    receiverUserId,
    type,
    title,
    message,
    metadata = null,
}) => {
    if (!receiverUserId || Number(receiverUserId) === Number(actorUserId)) {
        return false;
    }

    const normalizedMetadata =
        metadata && typeof metadata === 'object'
            ? {
                ...metadata,
                sourceUserId: metadata.sourceUserId || actorUserId || null,
            }
            : metadata;

    await notificationModel.createNotification({
        userId: receiverUserId,
        type,
        title,
        message,
        metadata: normalizedMetadata,
    });

    return true;
};

module.exports = {
    notifyModerators,
    notifyUserIfDifferent,
};
