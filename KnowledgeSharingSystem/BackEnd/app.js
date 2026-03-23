const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/index.route');
const authController = require('./controllers/auth.controller');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/login', authController.login);
app.post('/login/admin', authController.adminLogin);

app.use('/api', apiRoutes);

app.use((error, req, res, next) => {
    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        message: error.message || 'Internal server error.',
    });
});

module.exports = app;
