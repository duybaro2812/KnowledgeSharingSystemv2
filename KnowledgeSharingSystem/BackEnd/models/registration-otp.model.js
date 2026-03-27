const { getPool, sql } = require('../utils/db');

const createOrReplaceRegistrationOtp = async ({
    username,
    name,
    email,
    passwordHash,
    otpCode,
    expiresAt,
}) => {
    const pool = getPool();

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

module.exports = {
    createOrReplaceRegistrationOtp,
    findLatestActiveOtpByEmail,
    markOtpAsUsed,
};
