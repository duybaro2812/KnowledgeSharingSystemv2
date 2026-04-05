require('dotenv').config();

const bcrypt = require('bcrypt');
const { connectDB, getPool, sql } = require('../utils/db');
const userModel = require('../models/user.model');
const categoryModel = require('../models/category.model');
const notificationModel = require('../models/notification.model');
const { seedDefaultAdmin } = require('../services/admin-seed.service');

const SAMPLE_USERS = [
    {
        username: 'moderator01',
        password: 'moderator123',
        name: 'Moderator Demo',
        email: 'moderator01@kss.local',
        role: 'moderator',
    },
    {
        username: 'userdemo1',
        password: 'user12345',
        name: 'User Demo One',
        email: 'userdemo1@kss.local',
        role: 'user',
    },
    {
        username: 'userdemo2',
        password: 'user12345',
        name: 'User Demo Two',
        email: 'userdemo2@kss.local',
        role: 'user',
    },
];

const SAMPLE_CATEGORIES = [
    {
        name: 'Marketing',
        description: 'Sample category for marketing documents.',
    },
    {
        name: 'Lap trinh',
        description: 'Sample category for programming materials.',
    },
    {
        name: 'Vat ly',
        description: 'Sample category for physics materials.',
    },
];

const ensureUser = async ({ username, password, name, email, role }) => {
    const existingByUsername = await userModel.findUserByUsername(username);
    if (existingByUsername) {
        return existingByUsername;
    }

    const existingByEmail = await userModel.findUserByEmail(email);
    if (existingByEmail) {
        return existingByEmail;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await userModel.registerUser({
        username,
        name,
        email,
        passwordHash,
        role,
    });

    await userModel.setUserVerified(userId);

    return userModel.getUserProfileById(userId);
};

const ensureCategory = async ({ name, description }) => {
    const existing = await categoryModel.getActiveCategories({ keyword: name });
    const matched = existing.find(
        (category) => String(category.name).toLowerCase() === String(name).toLowerCase()
    );

    if (matched) {
        return matched;
    }

    const categoryId = await categoryModel.createCategory({ name, description });
    return categoryModel.getCategoryById(categoryId);
};

const ensurePointTransaction = async ({ userId, transactionType, points, description }) => {
    const pool = getPool();

    const existing = await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('transactionType', sql.NVarChar(50), transactionType)
        .input('description', sql.NVarChar(255), description)
        .query(`
            SELECT TOP 1 transactionId
            FROM dbo.PointTransactions
            WHERE userId = @userId
              AND transactionType = @transactionType
              AND description = @description;
        `);

    if (existing.recordset[0]) {
        return false;
    }

    await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('transactionType', sql.NVarChar(50), transactionType)
        .input('points', sql.Int, points)
        .input('description', sql.NVarChar(255), description)
        .query(`
            INSERT INTO dbo.PointTransactions (userId, transactionType, points, description)
            VALUES (@userId, @transactionType, @points, @description);

            UPDATE dbo.Users
            SET points = CASE
                WHEN points + @points < 0 THEN 0
                ELSE points + @points
            END
            WHERE userId = @userId;
        `);

    return true;
};

const ensureNotification = async ({ userId, type, title, message, metadata }) => {
    const pool = getPool();

    const existing = await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('type', sql.NVarChar(50), type)
        .input('title', sql.NVarChar(150), title)
        .query(`
            SELECT TOP 1 notificationId
            FROM dbo.Notifications
            WHERE userId = @userId
              AND type = @type
              AND title = @title
            ORDER BY notificationId DESC;
        `);

    if (existing.recordset[0]) {
        return existing.recordset[0];
    }

    return notificationModel.createNotification({
        userId,
        type,
        title,
        message,
        metadata,
    });
};

const run = async () => {
    await connectDB();
    await seedDefaultAdmin();

    const createdUsers = [];
    for (const sampleUser of SAMPLE_USERS) {
        const user = await ensureUser(sampleUser);
        createdUsers.push(user);
    }

    const createdCategories = [];
    for (const sampleCategory of SAMPLE_CATEGORIES) {
        const category = await ensureCategory(sampleCategory);
        createdCategories.push(category);
    }

    const demoUser = createdUsers.find((user) => user.username === 'userdemo1');
    const secondDemoUser = createdUsers.find((user) => user.username === 'userdemo2');
    const moderator = createdUsers.find((user) => user.username === 'moderator01');

    if (demoUser) {
        await ensurePointTransaction({
            userId: demoUser.userId,
            transactionType: 'moderation_reward',
            points: 60,
            description: 'Seed reward for frontend testing.',
        });

        await ensureNotification({
            userId: demoUser.userId,
            type: 'point_event_approved',
            title: 'Sample points approved',
            message: 'This sample notification helps test the notification dropdown.',
            metadata: {
                action: 'point.approved',
                target: { type: 'point_event', id: 0 },
                route: '/points',
            },
        });
    }

    if (moderator) {
        await ensureNotification({
            userId: moderator.userId,
            type: 'document_reported',
            title: 'Sample moderation notification',
            message: 'A sample moderation notification was created for dashboard testing.',
            metadata: {
                action: 'document.reported',
                target: { type: 'moderation_queue', id: 0 },
                route: '/moderation',
            },
        });
    }

    if (secondDemoUser) {
        await ensureNotification({
            userId: secondDemoUser.userId,
            type: 'qa_session_opened',
            title: 'Sample Q&A notification',
            message: 'This sample Q&A notification is available for UI testing.',
            metadata: {
                sessionId: 0,
                action: 'qa.opened',
                target: { type: 'qa_session', id: 0 },
                route: '/qa-sessions/0',
            },
        });
    }

    console.log('Seed test data completed successfully.');
    console.log('Sample accounts:');
    console.table(
        [
            { username: 'admin123', password: 'admin123', role: 'admin' },
            ...SAMPLE_USERS.map((user) => ({
                username: user.username,
                password: user.password,
                role: user.role,
            })),
        ]
    );
    console.log('Sample categories:');
    console.table(
        createdCategories.map((category) => ({
            categoryId: category.categoryId,
            name: category.name,
        }))
    );
};

if (require.main === module) {
    run()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Failed to seed test data:', error.message);
            process.exit(1);
        });
}

module.exports = {
    run,
};
