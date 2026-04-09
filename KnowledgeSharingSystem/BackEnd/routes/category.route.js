const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const categoryController = require('../controllers/category.controller');

const router = express.Router();

router.get('/', categoryController.getCategories);
router.post(
    '/',
    authMiddleware,
    categoryController.createCategory
);

module.exports = router;
