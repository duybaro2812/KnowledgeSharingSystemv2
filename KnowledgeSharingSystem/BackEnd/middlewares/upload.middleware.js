const multer = require('multer');

const allowedMimeTypes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
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

const documentUploadMiddleware = multer({
    storage: multer.memoryStorage(),
    fileFilter,
});

module.exports = {
    documentUploadMiddleware,
};
