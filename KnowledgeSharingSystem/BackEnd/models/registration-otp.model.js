const { getPool, sql, isPostgresClient } = require('../utils/db');

const createOrReplaceRegistrationOtp = async ({
    username,
    name,
    email,
    passwordHash,
    otpCode,
    expiresAt,
}) => {
    const pool = getPool();

    if (isPostgresClient()) {
        await pool.query(
            `
                DELETE FROM registration_otps
                WHERE (email = $1 OR username = $2)
                  AND is_used = FALSE;

                INSERT INTO registration_otps (
                    username,
                    name,
                    email,
                    password_hash,
                    otp_code,
                    expires_at
                )
                VALUES ($2, $3, $1, $4, $5, $6);
            `,
            [email, username, name, passwordHash, otpCode, expiresAt]
        );
        return;
    }

    await pool
        .request()
        .input('username', sql.NVarChar(100), username)
        .input('name', sql.NVarChar(100), name)
        .input('email', sql.NVarChar(150), email)
        .input('passwordHash', sql.NVarChar(255), passwordHash)
        .input('otpCode', sql.NVarChar(10), otpCode)
        .input('expiresAt', sql.DateTime2(3), expiresAt)
        .query(`
            DELETE FROM dbo.RegistrationOtps
            WHERE (email = @email OR username = @username)
              AND isUsed = 0;

            INSERT INTO dbo.RegistrationOtps (
                username,
                name,
                email,
                passwordHash,
                otpCode,
                expiresAt
            )
            VALUES (
                @username,
                @name,
                @email,
                @passwordHash,
                @otpCode,
                @expiresAt
            );
        `);
};

const findLatestActiveOtpByEmail = async (email) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    otp_id AS "otpId",
                    username,
                    name,
                    email,
                    password_hash AS "passwordHash",
                    otp_code AS "otpCode",
                    expires_at AS "expiresAt",
                    is_used AS "isUsed",
                    created_at AS "createdAt",
                    used_at AS "usedAt"
                FROM registration_otps
                WHERE email = $1
                  AND is_used = FALSE
                ORDER BY created_at DESC
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
                otpId,
                username,
                name,
                email,
                passwordHash,
                otpCode,
                expiresAt,
                isUsed,
                createdAt,
                usedAt
            FROM dbo.RegistrationOtps
            WHERE email = @email
              AND isUsed = 0
            ORDER BY createdAt DESC;
        `);

    return result.recordset[0] || null;
};

const markOtpAsUsed = async (otpId) => {
    const pool = getPool();

    if (isPostgresClient()) {
        await pool.query(
            `
                UPDATE registration_otps
                SET
                    is_used = TRUE,
                    used_at = NOW()
                WHERE otp_id = $1;
            `,
            [otpId]
        );
        return;
    }

    await pool
        .request()
        .input('otpId', sql.Int, otpId)
        .query(`
            UPDATE dbo.RegistrationOtps
            SET
                isUsed = 1,
                usedAt = SYSDATETIME()
            WHERE otpId = @otpId;
        `);
};

const createOrReplaceForgotPasswordOtp = async ({
    username,
    name,
    email,
    passwordHash,
    otpCode,
    expiresAt,
}) => {
    const pool = getPool();

    if (isPostgresClient()) {
        await pool.query(
            `
                DELETE FROM registration_otps
                WHERE email = $1
                  AND is_used = FALSE;

                INSERT INTO registration_otps (
                    username,
                    name,
                    email,
                    password_hash,
                    otp_code,
                    expires_at
                )
                VALUES ($2, $3, $1, $4, $5, $6);
            `,
            [email, username, name, passwordHash, otpCode, expiresAt]
        );
        return;
    }

    await pool
        .request()
        .input('username', sql.NVarChar(100), username)
        .input('name', sql.NVarChar(100), name)
        .input('email', sql.NVarChar(150), email)
        .input('passwordHash', sql.NVarChar(255), passwordHash)
        .input('otpCode', sql.NVarChar(10), otpCode)
        .input('expiresAt', sql.DateTime2(3), expiresAt)
        .query(`
            DELETE FROM dbo.RegistrationOtps
            WHERE email = @email
              AND isUsed = 0;

            INSERT INTO dbo.RegistrationOtps (
                username,
                name,
                email,
                passwordHash,
                otpCode,
                expiresAt
            )
            VALUES (
                @username,
                @name,
                @email,
                @passwordHash,
                @otpCode,
                @expiresAt
            );
        `);
};

module.exports = {
    createOrReplaceRegistrationOtp,
    findLatestActiveOtpByEmail,
    markOtpAsUsed,
    createOrReplaceForgotPasswordOtp,
};
