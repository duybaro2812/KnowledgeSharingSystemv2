const multer = require('multer');

const allowedMimeTypes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
]);

const allowedAvatarMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
]);

const fileFilter = (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
        const error = new Error('Only document files are allowed (PDF, DOC, DOCX, PPT, PPTX, TXT).');
        error.statusCode = 400;
        cb(error);
        return;
    }

    cb(null, true);
};

const avatarFileFilter = (req, file, cb) => {
    if (!allowedAvatarMimeTypes.has(file.mimetype)) {
        const error = new Error('Only avatar images are allowed (JPG, PNG, WEBP, GIF).');
        error.statusCode = 400;
        cb(error);
        return;
    }

    cb(null, true);
};

const documentUploadMiddleware = multer({
    storage: multer.memoryStorage(),
    fileFilter,
});

const avatarUploadMiddleware = multer({
    storage: multer.memoryStorage(),
    fileFilter: avatarFileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024,
    },
});

module.exports = {
    documentUploadMiddleware,
    avatarUploadMiddleware,
};
