const nodemailer = require('nodemailer');

const buildTransporter = () => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

const sendRegisterOtpEmail = async ({ toEmail, otpCode, expiresMinutes = 10 }) => {
    const transporter = buildTransporter();

    if (!transporter) {
        if (process.env.OTP_DEV_FALLBACK === 'true') {
            return {
                delivered: false,
                fallback: true,
                otpCode,
            };
        }

        throw new Error('SMTP is not configured. Please set SMTP_HOST/SMTP_USER/SMTP_PASS.');
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    await transporter.sendMail({
        from,
        to: toEmail,
        subject: 'Your OTP for account registration',
        text: `Your OTP is ${otpCode}. It expires in ${expiresMinutes} minutes.`,
        html: `
            <div style="font-family: Segoe UI, Arial, sans-serif; padding: 16px;">
                <h2>OTP Verification</h2>
                <p>Your OTP code is:</p>
                <p style="font-size: 24px; font-weight: 700; letter-spacing: 4px;">${otpCode}</p>
                <p>This code expires in ${expiresMinutes} minutes.</p>
            </div>
        `,
    });

    return {
        delivered: true,
        fallback: false,
    };
};

module.exports = {
    sendRegisterOtpEmail,
};
