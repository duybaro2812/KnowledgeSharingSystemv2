const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const userController = require('../controllers/user.controller');

const router = express.Router();

router.patch(
    '/me',
    authMiddleware,
    userController.updateMyProfile
);

router.patch(
    '/me/password',
    authMiddleware,
    userController.changeMyPassword
);

router.get(
    '/',
    authMiddleware,
    roleMiddleware('admin'),
    userController.getUsers
);

router.get(
    '/audit-logs',
    authMiddleware,
    roleMiddleware('admin'),
    userController.getAdminActionLogs
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

router.delete(
    '/:id',
    authMiddleware,
    roleMiddleware('admin'),
    userController.deleteUserAccount
);

module.exports = router;
