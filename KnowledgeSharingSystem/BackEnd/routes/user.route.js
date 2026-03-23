const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const userController = require('../controllers/user.controller');

const router = express.Router();

router.get(
    '/',
    authMiddleware,
    roleMiddleware('admin'),
    userController.getUsers
);

router.patch(
    '/:id/active-status',
    authMiddleware,
    roleMiddleware('admin'),
    userController.setUserActiveStatus
);

router.patch(
    '/:id/role',
    authMiddleware,
    roleMiddleware('admin'),
    userController.updateUserRole
);

module.exports = router;
