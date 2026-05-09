const express = require('express');
const authMiddleware = require('../../../middlewares/auth.middleware');
const roleMiddleware = require('../../../middlewares/role.middleware');
const categoryController = require('../../../controllers/category.controller');

const router = express.Router();

router.get(
    '/manage',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    categoryController.getCategories
);
router.get('/', categoryController.getCategories);
router.post(
    '/',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    categoryController.createCategory
);
router.put(
    '/:id',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    categoryController.updateCategory
);
router.delete(
    '/:id',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    categoryController.deactivateCategory
);
router.patch(
    '/:id/restore',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    categoryController.restoreCategory
);

module.exports = router;
