const stripDangerousChars = (value) =>
    String(value)
        .replace(/\0/g, '')
        .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        .trim();

const normalizeRequiredText = ({
    value,
    fieldName,
    maxLength,
    minLength = 1,
}) => {
    const normalized = stripDangerousChars(value ?? '');

    if (!normalized) {
        const error = new Error(`${fieldName} is required.`);
        error.statusCode = 400;
        throw error;
    }

    if (normalized.length < minLength) {
        const error = new Error(`${fieldName} must be at least ${minLength} characters.`);
        error.statusCode = 400;
        throw error;
    }

    if (maxLength && normalized.length > maxLength) {
        const error = new Error(`${fieldName} must not exceed ${maxLength} characters.`);
        error.statusCode = 400;
        throw error;
    }

    return normalized;
};

const normalizeOptionalText = ({ value, fieldName, maxLength }) => {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const normalized = stripDangerousChars(value);

    if (!normalized) {
        return null;
    }

    if (maxLength && normalized.length > maxLength) {
        const error = new Error(`${fieldName} must not exceed ${maxLength} characters.`);
        error.statusCode = 400;
        throw error;
    }

    return normalized;
};

const normalizeEmail = ({ value, maxLength }) => {
    const normalized = normalizeRequiredText({
        value,
        fieldName: 'Email',
        maxLength,
    }).toLowerCase();

    const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicEmailRegex.test(normalized)) {
        const error = new Error('Email format is invalid.');
        error.statusCode = 400;
        throw error;
    }

    return normalized;
};

const normalizeUsername = ({ value, minLength, maxLength }) => {
    const normalized = normalizeRequiredText({
        value,
        fieldName: 'Username',
        minLength,
        maxLength,
    });

    if (!/^[A-Za-z0-9_.-]+$/.test(normalized)) {
        const error = new Error(
            'Username may only contain letters, numbers, underscore, dot, and hyphen.'
        );
        error.statusCode = 400;
        throw error;
    }

    return normalized;
};

const normalizePassword = ({ value, minLength, maxLength, fieldName = 'Password' }) => {
    if (typeof value !== 'string') {
        const error = new Error(`${fieldName} is required.`);
        error.statusCode = 400;
        throw error;
    }

    const normalized = value.trim();

    if (!normalized) {
        const error = new Error(`${fieldName} is required.`);
        error.statusCode = 400;
        throw error;
    }

    if (normalized.length < minLength) {
        const error = new Error(`${fieldName} must be at least ${minLength} characters.`);
        error.statusCode = 400;
        throw error;
    }

    if (maxLength && normalized.length > maxLength) {
        const error = new Error(`${fieldName} must not exceed ${maxLength} characters.`);
        error.statusCode = 400;
        throw error;
    }

    return normalized;
};

module.exports = {
    normalizeRequiredText,
    normalizeOptionalText,
    normalizeEmail,
    normalizeUsername,
    normalizePassword,
};
