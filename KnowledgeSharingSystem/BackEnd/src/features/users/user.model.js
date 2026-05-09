const { getPool, sql, isPostgresClient } = require('../../../utils/db');

let profileColumnsEnsured = false;

const ensureUserProfileColumns = async () => {
    if (profileColumnsEnsured) return;
    const pool = getPool();

    if (isPostgresClient()) {
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) NULL;`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(500) NULL;`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS school VARCHAR(150) NULL;`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS major VARCHAR(150) NULL;`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS started_year VARCHAR(10) NULL;`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(20) NOT NULL DEFAULT 'vi';`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS region VARCHAR(80) NOT NULL DEFAULT 'Vietnam';`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS additional_email VARCHAR(255) NULL;`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_comments BOOLEAN NOT NULL DEFAULT TRUE;`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_document_approved BOOLEAN NOT NULL DEFAULT TRUE;`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_qa_messages BOOLEAN NOT NULL DEFAULT TRUE;`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_points BOOLEAN NOT NULL DEFAULT TRUE;`);
    } else {
        await pool.request().query(`
            IF COL_LENGTH('dbo.Users', 'avatarUrl') IS NULL
            BEGIN
                ALTER TABLE dbo.Users ADD avatarUrl NVARCHAR(500) NULL;
            END;
            IF COL_LENGTH('dbo.Users', 'bio') IS NULL
            BEGIN
                ALTER TABLE dbo.Users ADD bio NVARCHAR(500) NULL;
            END;
            IF COL_LENGTH('dbo.Users', 'school') IS NULL
            BEGIN
                ALTER TABLE dbo.Users ADD school NVARCHAR(150) NULL;
            END;
            IF COL_LENGTH('dbo.Users', 'major') IS NULL
            BEGIN
                ALTER TABLE dbo.Users ADD major NVARCHAR(150) NULL;
            END;
            IF COL_LENGTH('dbo.Users', 'startedYear') IS NULL
            BEGIN
                ALTER TABLE dbo.Users ADD startedYear NVARCHAR(10) NULL;
            END;
            IF COL_LENGTH('dbo.Users', 'language') IS NULL
            BEGIN
                ALTER TABLE dbo.Users ADD language NVARCHAR(20) NOT NULL CONSTRAINT DF_Users_language DEFAULT N'vi';
            END;
            IF COL_LENGTH('dbo.Users', 'region') IS NULL
            BEGIN
                ALTER TABLE dbo.Users ADD region NVARCHAR(80) NOT NULL CONSTRAINT DF_Users_region DEFAULT N'Vietnam';
            END;
            IF COL_LENGTH('dbo.Users', 'additionalEmail') IS NULL
            BEGIN
                ALTER TABLE dbo.Users ADD additionalEmail NVARCHAR(255) NULL;
            END;
            IF COL_LENGTH('dbo.Users', 'notifyComments') IS NULL
            BEGIN
                ALTER TABLE dbo.Users ADD notifyComments BIT NOT NULL CONSTRAINT DF_Users_notifyComments DEFAULT 1;
            END;
            IF COL_LENGTH('dbo.Users', 'notifyDocumentApproved') IS NULL
            BEGIN
                ALTER TABLE dbo.Users ADD notifyDocumentApproved BIT NOT NULL CONSTRAINT DF_Users_notifyDocumentApproved DEFAULT 1;
            END;
            IF COL_LENGTH('dbo.Users', 'notifyQaMessages') IS NULL
            BEGIN
                ALTER TABLE dbo.Users ADD notifyQaMessages BIT NOT NULL CONSTRAINT DF_Users_notifyQaMessages DEFAULT 1;
            END;
            IF COL_LENGTH('dbo.Users', 'notifyPoints') IS NULL
            BEGIN
                ALTER TABLE dbo.Users ADD notifyPoints BIT NOT NULL CONSTRAINT DF_Users_notifyPoints DEFAULT 1;
            END;
        `);
    }

    profileColumnsEnsured = true;
};

const pgUserSelect = `
    SELECT
        user_id AS "userId",
        username,
        name,
        email,
        avatar_url AS "avatarUrl",
        bio,
        school,
        major,
        started_year AS "startedYear",
        language,
        region,
        additional_email AS "additionalEmail",
        notify_comments AS "notifyComments",
        notify_document_approved AS "notifyDocumentApproved",
        notify_qa_messages AS "notifyQaMessages",
        notify_points AS "notifyPoints",
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
    await ensureUserProfileColumns();

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
                avatarUrl,
                bio,
                school,
                major,
                startedYear,
                language,
                region,
                additionalEmail,
                notifyComments,
                notifyDocumentApproved,
                notifyQaMessages,
                notifyPoints,
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
    await ensureUserProfileColumns();

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
                avatarUrl,
                bio,
                school,
                major,
                startedYear,
                language,
                region,
                additionalEmail,
                notifyComments,
                notifyDocumentApproved,
                notifyQaMessages,
                notifyPoints,
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

const findUserByPrimaryOrAdditionalEmail = async (email) => {
    const pool = getPool();
    await ensureUserProfileColumns();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                ${pgUserSelect}
                WHERE email = $1
                   OR additional_email = $1
                ORDER BY
                    CASE WHEN email = $1 THEN 0 ELSE 1 END,
                    user_id
                LIMIT 1;
            `,
            [email]
        );
        return result.rows[0] || null;
    }

    const result = await pool
        .request()
        .input('email', sql.NVarChar(150), email)
        .query(`
            SELECT TOP 1
                userId,
                username,
                name,
                email,
                avatarUrl,
                bio,
                school,
                major,
                startedYear,
                language,
                region,
                additionalEmail,
                notifyComments,
                notifyDocumentApproved,
                notifyQaMessages,
                notifyPoints,
                points,
                passwordHash,
                role,
                isActive,
                isVerified,
                createdAt,
                updatedAt
            FROM dbo.Users
            WHERE email = @email
               OR additionalEmail = @email
            ORDER BY CASE WHEN email = @email THEN 0 ELSE 1 END, userId;
        `);

    return result.recordset[0] || null;
};

const isEmailUsedByAnotherUser = async ({ email, userId }) => {
    const pool = getPool();
    await ensureUserProfileColumns();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT EXISTS (
                    SELECT 1
                    FROM users
                    WHERE user_id <> $2
                      AND (email = $1 OR additional_email = $1)
                ) AS "exists";
            `,
            [email, userId]
        );
        return Boolean(result.rows[0]?.exists);
    }

    const result = await pool
        .request()
        .input('email', sql.NVarChar(150), email)
        .input('userId', sql.Int, userId)
        .query(`
            SELECT CASE WHEN EXISTS (
                SELECT 1
                FROM dbo.Users
                WHERE userId <> @userId
                  AND (email = @email OR additionalEmail = @email)
            ) THEN 1 ELSE 0 END AS [exists];
        `);

    return Boolean(result.recordset[0]?.exists);
};

const getUserProfileById = async (userId) => {
    const pool = getPool();
    await ensureUserProfileColumns();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    user_id AS "userId",
                    username,
                    name,
                    email,
                    avatar_url AS "avatarUrl",
                    bio,
                    school,
                    major,
                    started_year AS "startedYear",
                    language,
                    region,
                    additional_email AS "additionalEmail",
                    notify_comments AS "notifyComments",
                    notify_document_approved AS "notifyDocumentApproved",
                    notify_qa_messages AS "notifyQaMessages",
                    notify_points AS "notifyPoints",
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
                avatarUrl,
                bio,
                school,
                major,
                startedYear,
                language,
                region,
                additionalEmail,
                notifyComments,
                notifyDocumentApproved,
                notifyQaMessages,
                notifyPoints,
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
    await ensureUserProfileColumns();

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
            avatarUrl,
            bio,
            school,
            major,
            startedYear,
            language,
            region,
            additionalEmail,
            notifyComments,
            notifyDocumentApproved,
            notifyQaMessages,
            notifyPoints,
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

const updateMyProfile = async ({
    userId,
    name,
    bio = null,
    school = null,
    major = null,
    startedYear = null,
    language = 'vi',
    region = 'Vietnam',
    additionalEmail = null,
    notifyComments = true,
    notifyDocumentApproved = true,
    notifyQaMessages = true,
    notifyPoints = true,
}) => {
    const pool = getPool();
    await ensureUserProfileColumns();

    if (isPostgresClient()) {
        await pool.query(
            `
                UPDATE users
                SET
                    name = $2,
                    bio = $3,
                    school = $4,
                    major = $5,
                    started_year = $6,
                    language = $7,
                    region = $8,
                    additional_email = $9,
                    notify_comments = $10,
                    notify_document_approved = $11,
                    notify_qa_messages = $12,
                    notify_points = $13,
                    updated_at = NOW()
                WHERE user_id = $1;
            `,
            [
                userId,
                name,
                bio || null,
                school || null,
                major || null,
                startedYear || null,
                language || 'vi',
                region || 'Vietnam',
                additionalEmail || null,
                Boolean(notifyComments),
                Boolean(notifyDocumentApproved),
                Boolean(notifyQaMessages),
                Boolean(notifyPoints),
            ]
        );
        return;
    }

    await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('name', sql.NVarChar(100), name)
        .input('bio', sql.NVarChar(500), bio || null)
        .input('school', sql.NVarChar(150), school || null)
        .input('major', sql.NVarChar(150), major || null)
        .input('startedYear', sql.NVarChar(10), startedYear || null)
        .input('language', sql.NVarChar(20), language || 'vi')
        .input('region', sql.NVarChar(80), region || 'Vietnam')
        .input('additionalEmail', sql.NVarChar(255), additionalEmail || null)
        .input('notifyComments', sql.Bit, Boolean(notifyComments))
        .input('notifyDocumentApproved', sql.Bit, Boolean(notifyDocumentApproved))
        .input('notifyQaMessages', sql.Bit, Boolean(notifyQaMessages))
        .input('notifyPoints', sql.Bit, Boolean(notifyPoints))
        .query(`
            UPDATE dbo.Users
            SET
                name = @name,
                bio = @bio,
                school = @school,
                major = @major,
                startedYear = @startedYear,
                language = @language,
                region = @region,
                additionalEmail = @additionalEmail,
                notifyComments = @notifyComments,
                notifyDocumentApproved = @notifyDocumentApproved,
                notifyQaMessages = @notifyQaMessages,
                notifyPoints = @notifyPoints,
                updatedAt = SYSDATETIME()
            WHERE userId = @userId;
        `);
};

const updateMyAvatar = async ({ userId, avatarUrl }) => {
    const pool = getPool();
    await ensureUserProfileColumns();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                UPDATE users
                SET
                    avatar_url = $2,
                    updated_at = NOW()
                WHERE user_id = $1
                RETURNING user_id;
            `,
            [userId, avatarUrl || null]
        );
        return result.rowCount;
    }

    const result = await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('avatarUrl', sql.NVarChar(500), avatarUrl || null)
        .query(`
            UPDATE dbo.Users
            SET
                avatarUrl = @avatarUrl,
                updatedAt = SYSDATETIME()
            WHERE userId = @userId;

            SELECT @@ROWCOUNT AS affectedRows;
        `);

    return result.recordset[0]?.affectedRows || 0;
};

const getUserAuthById = async (userId) => {
    const pool = getPool();
    await ensureUserProfileColumns();

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
                avatarUrl,
                bio,
                school,
                major,
                startedYear,
                language,
                region,
                additionalEmail,
                notifyComments,
                notifyDocumentApproved,
                notifyQaMessages,
                notifyPoints,
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
    findUserByPrimaryOrAdditionalEmail,
    isEmailUsedByAnotherUser,
    getUserProfileById,
    setUserActiveStatus,
    getUsers,
    getActiveModerators,
    getActiveModeratorsAndAdmins,
    updateUserRole,
    updateMyProfile,
    updateMyAvatar,
    getUserAuthById,
    updatePassword,
    setUserVerified,
    softDeleteUserByAdmin,
};
