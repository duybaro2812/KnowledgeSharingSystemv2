const { getPool, sql } = require('../utils/db');

const registerUser = async ({ username, name, email, passwordHash, role }) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('username', sql.NVarChar(100), username)
        .input('name', sql.NVarChar(100), name)
        .input('email', sql.NVarChar(150), email)
        .input('passwordHash', sql.NVarChar(255), passwordHash)
        .input('role', sql.NVarChar(20), role)
        .execute('dbo.usp_RegisterUser');

    return result.recordset[0].userId;
};

const findUserByUsername = async (username) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('username', sql.NVarChar(100), username)
        .query(`
            SELECT
                userId,
                username,
                name,
                email,
                points,
                passwordHash,
                role,
                isActive,
                isVerified,
                createdAt,
                updatedAt
            FROM dbo.Users
            WHERE username = @username
        `);

    return result.recordset[0] || null;
};

const findUserByEmail = async (email) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('email', sql.NVarChar(150), email)
        .query(`
            SELECT
                userId,
                username,
                name,
                email,
                points,
                passwordHash,
                role,
                isActive,
                isVerified,
                createdAt,
                updatedAt
            FROM dbo.Users
            WHERE email = @email
        `);

    return result.recordset[0] || null;
};

const getUserProfileById = async (userId) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('userId', sql.Int, userId)
        .query(`
            SELECT
                userId,
                username,
                name,
                email,
                points,
                role,
                isActive,
                isVerified,
                createdAt,
                updatedAt
            FROM dbo.Users
            WHERE userId = @userId;
        `);

    return result.recordset[0] || null;
};

const setUserActiveStatus = async ({ userId, isActive }) => {
    const pool = getPool();

    await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('isActive', sql.Bit, isActive)
        .execute('dbo.usp_SetUserActiveStatus');
};

const getUsers = async () => {
    const pool = getPool();

    const result = await pool.request().query(`
        SELECT
            userId,
            username,
            name,
            email,
            points,
            role,
            isActive,
            isVerified,
            createdAt,
            updatedAt
        FROM dbo.Users
        ORDER BY userId
    `);

    return result.recordset;
};

const getActiveModeratorsAndAdmins = async () => {
    const pool = getPool();

    const result = await pool.request().query(`
        SELECT
            userId,
            username,
            name,
            email,
            role
        FROM dbo.Users
        WHERE isActive = 1
          AND role IN (N'moderator', N'admin')
        ORDER BY userId;
    `);

    return result.recordset;
};

const updateUserRole = async ({ userId, role }) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('role', sql.NVarChar(20), role)
        .query(`
            UPDATE dbo.Users
            SET role = @role
            WHERE userId = @userId
              AND role <> N'admin';

            SELECT @@ROWCOUNT AS affectedRows;
        `);

    return result.recordset[0]?.affectedRows || 0;
};

const updateMyProfile = async ({ userId, name }) => {
    const pool = getPool();

    await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('name', sql.NVarChar(100), name)
        .input('username', sql.NVarChar(100), null)
        .execute('dbo.usp_UpdateUserProfile');
};

const getUserAuthById = async (userId) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('userId', sql.Int, userId)
        .query(`
            SELECT
                userId,
                username,
                name,
                email,
                passwordHash,
                role,
                isActive,
                isVerified,
                createdAt,
                updatedAt
            FROM dbo.Users
            WHERE userId = @userId
        `);

    return result.recordset[0] || null;
};

const updatePassword = async ({ userId, passwordHash }) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('passwordHash', sql.NVarChar(255), passwordHash)
        .query(`
            UPDATE dbo.Users
            SET
                passwordHash = @passwordHash,
                updatedAt = SYSDATETIME()
            WHERE userId = @userId;

            SELECT @@ROWCOUNT AS affectedRows;
        `);

    return result.recordset[0]?.affectedRows || 0;
};

const setUserVerified = async (userId) => {
    const pool = getPool();

    await pool
        .request()
        .input('userId', sql.Int, userId)
        .query(`
            UPDATE dbo.Users
            SET
                isVerified = 1,
                updatedAt = SYSDATETIME()
            WHERE userId = @userId;
        `);
};

const softDeleteUserByAdmin = async ({ userId }) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('userId', sql.Int, userId)
        .query(`
            UPDATE dbo.Users
            SET
                isActive = 0,
                isVerified = 0,
                role = N'user',
                name = CONCAT(N'Deleted User #', userId),
                username = CONCAT(N'deleted_user_', userId),
                email = CONCAT(N'deleted_', userId, N'@deleted.local'),
                updatedAt = SYSDATETIME()
            WHERE userId = @userId
              AND role <> N'admin';

            SELECT @@ROWCOUNT AS affectedRows;
        `);

    return result.recordset[0]?.affectedRows || 0;
};

module.exports = {
    registerUser,
    findUserByUsername,
    findUserByEmail,
    getUserProfileById,
    setUserActiveStatus,
    getUsers,
    getActiveModeratorsAndAdmins,
    updateUserRole,
    updateMyProfile,
    getUserAuthById,
    updatePassword,
    setUserVerified,
    softDeleteUserByAdmin,
};
