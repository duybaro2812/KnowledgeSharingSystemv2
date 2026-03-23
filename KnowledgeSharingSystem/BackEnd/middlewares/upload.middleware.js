const fs = require('fs');
const path = require('path');
const multer = require('multer');

const MAX_DOCUMENT_FILE_SIZE = 15 * 1024 * 1024;
const uploadsRoot = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
const documentUploadDir = path.join(uploadsRoot, 'documents');

if (!fs.existsSync(documentUploadDir)) {
    fs.mkdirSync(documentUploadDir, { recursive: true });
}

const allowedMimeTypes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
]);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, documentUploadDir);
    },
    filename: (req, file, cb) => {
        const safeOriginalName = file.originalname.replace(/\s+/g, '-');
        cb(null, `${Date.now()}-${safeOriginalName}`);
    },
});

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
    storage,
    limits: {
        fileSize: MAX_DOCUMENT_FILE_SIZE,
    },
    fileFilter,
});

module.exports = {
    documentUploadMiddleware,
    MAX_DOCUMENT_FILE_SIZE,
    documentUploadDir,
};
