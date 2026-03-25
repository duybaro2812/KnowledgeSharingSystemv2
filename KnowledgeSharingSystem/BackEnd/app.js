const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes');
const authController = require('./controllers/auth.controller');
const notificationModel = require('./models/notification.model');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));

app.post('/login', authController.login);
app.post('/login/admin', authController.adminLogin);

app.use('/api', apiRoutes);

app.use(async (error, req, res, next) => {
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal server error.';
    const isDocumentUploadApi = req.method === 'POST' && req.originalUrl.startsWith('/api/documents');
    const isUploadValidationError =
        error.code === 'LIMIT_FILE_SIZE' ||
        message === 'A document file is required.' ||
        message.startsWith('Only document files are allowed');

    if (error.code === 'LIMIT_FILE_SIZE') {
        statusCode = 400;
        message = 'Document file must not exceed 15MB.';
    }

    if (isDocumentUploadApi && isUploadValidationError && req.user?.userId) {
        try {
            await notificationModel.createNotification({
                userId: req.user.userId,
                type: 'document_upload_rejected',
                title: 'Upload Rejected',
                message: message === 'A document file is required.' ? 'Your document upload was rejected because no file was provided.' : `Your document upload was rejected: ${message}`,
                metadata: {
                    reason: message,
                },
            });
        } catch (notifyError) {
            console.error('Failed to create upload rejected notification:', notifyError.message);
        }
    }

    res.status(statusCode).json({
        success: false,
        message,
    });
});

module.exports = app;
