const requiredKeys = ['JWT_SECRET', 'DB_NAME'];

const optionalButImportant = [
    'DB_SERVER',
    'DB_USER',
    'DB_PASSWORD',
    'CORS_ALLOWED_ORIGINS',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
];

const validateEnv = () => {
    const missingRequired = requiredKeys.filter((key) => !process.env[key]);

    if (missingRequired.length > 0) {
        const message = `Missing required environment variables: ${missingRequired.join(', ')}`;
        const error = new Error(message);
        error.statusCode = 500;
        throw error;
    }

    const missingOptional = optionalButImportant.filter((key) => !process.env[key]);
    if (missingOptional.length > 0) {
        console.warn(
            `[env] Missing optional env keys: ${missingOptional.join(', ')}. Some features may be limited.`
        );
    }
};

module.exports = {
    validateEnv,
};

