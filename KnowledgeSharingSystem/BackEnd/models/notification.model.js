const { getPool, sql } = require('../utils/db');

const createNotification = async ({ userId, type, title, message, metadata = null }) => {
    const pool = getPool();

    await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('type', sql.NVarChar(50), type)
        .input('title', sql.NVarChar(150), title)
        .input('message', sql.NVarChar(500), message)
        .input('metadata', sql.NVarChar(sql.MAX), metadata ? JSON.stringify(metadata) : null)
        .query(`
            INSERT INTO dbo.Notifications (userId, type, title, message, metadata)
            VALUES (@userId, @type, @title, @message, @metadata);
        `);
};

const getMyNotifications = async ({ userId, isRead = null }) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('isRead', sql.Bit, isRead)
        .execute('dbo.usp_GetMyNotifications');

    return result.recordset;
};

const markNotificationAsRead = async ({ notificationId, userId }) => {
    const pool = getPool();

    await pool
        .request()
        .input('notificationId', sql.Int, notificationId)
        .input('userId', sql.Int, userId)
        .execute('dbo.usp_MarkNotificationAsRead');
};

module.exports = {
    createNotification,
    getMyNotifications,
    markNotificationAsRead,
};
