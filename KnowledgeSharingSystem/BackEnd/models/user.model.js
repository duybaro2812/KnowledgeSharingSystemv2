const { getPool, sql, isPostgresClient } = require('../utils/db');

const pgUserSelect = `
    SELECT
        user_id AS "userId",
        username,
        name,
        email,
        points,
        password_hash AS "passwordHash",
        role,
        is_active AS "isActive",
        is_verified AS "isVerified",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    FROM users
`;

const registerUser = async ({ username, name, email, passwordHash, role }) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                INSERT INTO users (username, name, email, password_hash, role)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING user_id AS "userId";
            `,
            [username, name, email, passwordHash, role]
        );

        return result.rows[0].userId;
    }

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

    if (isPostgresClient()) {
        const result = await pool.query(`${pgUserSelect} WHERE username = $1;`, [username]);
        return result.rows[0] || null;
    }

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

    if (isPostgresClient()) {
        const result = await pool.query(`${pgUserSelect} WHERE email = $1;`, [email]);
        return result.rows[0] || null;
    }

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    user_id AS "userId",
                    username,
                    name,
                    email,
                    points,
                    role,
                    is_active AS "isActive",
                    is_verified AS "isVerified",
                    created_at AS "createdAt",
                    updated_at AS "updatedAt"
                FROM users
                WHERE user_id = $1;
            `,
            [userId]
        );
        return result.rows[0] || null;
    }

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

    if (isPostgresClient()) {
        await pool.query(
            `
                UPDATE users
                SET is_active = $2
                WHERE user_id = $1;
            `,
            [userId, Boolean(isActive)]
        );
        return;
    }

    await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('isActive', sql.Bit, isActive)
        .execute('dbo.usp_SetUserActiveStatus');
};

const getUsers = async () => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(`${pgUserSelect} ORDER BY "userId";`);
        return result.rows;
    }

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    user_id AS "userId",
                    username,
                    name,
                    email,
                    role
                FROM users
                WHERE is_active = TRUE
                  AND role IN ('moderator', 'admin')
                ORDER BY user_id;
            `
        );
        return result.rows;
    }

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

const getActiveModerators = async () => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    user_id AS "userId",
                    username,
                    name,
                    email,
                    role
                FROM users
                WHERE is_active = TRUE
                  AND role = 'moderator'
                ORDER BY user_id;
            `
        );
        return result.rows;
    }

    const result = await pool.request().query(`
        SELECT
            userId,
            username,
            name,
            email,
            role
        FROM dbo.Users
        WHERE isActive = 1
          AND role = N'moderator'
        ORDER BY userId;
    `);

    return result.recordset;
};

const updateUserRole = async ({ userId, role }) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                UPDATE users
                SET role = $2
                WHERE user_id = $1
                  AND role <> 'admin'
                RETURNING user_id;
            `,
            [userId, role]
        );
        return result.rowCount;
    }

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

    if (isPostgresClient()) {
        await pool.query(
            `
                UPDATE users
                SET
                    name = $2,
                    updated_at = NOW()
                WHERE user_id = $1;
            `,
            [userId, name]
        );
        return;
    }

    await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('name', sql.NVarChar(100), name)
        .input('username', sql.NVarChar(100), null)
        .execute('dbo.usp_UpdateUserProfile');
};

const getUserAuthById = async (userId) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(`${pgUserSelect} WHERE user_id = $1;`, [userId]);
        return result.rows[0] || null;
    }

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                UPDATE users
                SET
                    password_hash = $2,
                    updated_at = NOW()
                WHERE user_id = $1
                RETURNING user_id;
            `,
            [userId, passwordHash]
        );
        return result.rowCount;
    }

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

    if (isPostgresClient()) {
        await pool.query(
            `
                UPDATE users
                SET
                    is_verified = TRUE,
                    updated_at = NOW()
                WHERE user_id = $1;
            `,
            [userId]
        );
        return;
    }

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                UPDATE users
                SET
                    is_active = FALSE,
                    is_verified = FALSE,
                    role = 'user',
                    name = CONCAT('Deleted User #', user_id::TEXT),
                    username = CONCAT('deleted_user_', user_id::TEXT),
                    email = CONCAT('deleted_', user_id::TEXT, '@deleted.local'),
                    updated_at = NOW()
                WHERE user_id = $1
                  AND role <> 'admin'
                RETURNING user_id;
            `,
            [userId]
        );

        return result.rowCount;
    }

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
    getActiveModerators,
    getActiveModeratorsAndAdmins,
    updateUserRole,
    updateMyProfile,
    getUserAuthById,
    updatePassword,
    setUserVerified,
    softDeleteUserByAdmin,
};
