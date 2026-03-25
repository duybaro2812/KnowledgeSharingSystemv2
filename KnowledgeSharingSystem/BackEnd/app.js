const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes');
const authController = require('./controllers/auth.controller');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));

app.post('/login', authController.login);
app.post('/login/admin', authController.adminLogin);

app.use('/api', apiRoutes);

app.use((error, req, res, next) => {
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal server error.';

    if (error.code === 'LIMIT_FILE_SIZE') {
        statusCode = 400;
        message = 'Document file must not exceed 15MB.';
    }

    res.status(statusCode).json({
        success: false,
        message,
    });
});

module.exports = app;
