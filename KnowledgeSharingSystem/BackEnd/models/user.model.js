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

const getUserProfileById = async (userId) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('userId', sql.Int, userId)
        .execute('dbo.usp_GetUserProfile');

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

module.exports = {
    registerUser,
    findUserByUsername,
    getUserProfileById,
    setUserActiveStatus,
    getUsers,
    updateUserRole,
};
