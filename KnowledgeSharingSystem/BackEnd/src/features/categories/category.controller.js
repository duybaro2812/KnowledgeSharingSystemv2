const categoryModel = require('../../../models/category.model');
const { VALIDATION_RULES } = require('../../../config/validation-rules');
const {
    normalizeRequiredText,
    normalizeOptionalText,
} = require('../../../utils/input-sanitizer');

const getCategories = async (req, res, next) => {
    try {
        const keyword = normalizeOptionalText({
            value: req.query?.keyword,
            maxLength: VALIDATION_RULES.category.nameMax,
        });
        const includeInactive =
            (req.path === '/manage' || String(req.query?.includeInactive || '').toLowerCase() === 'true') &&
            ['admin', 'moderator'].includes(String(req.user?.role || '').toLowerCase());

        const categories = await categoryModel.getActiveCategories({
            keyword,
            includeInactive,
        });

        res.json({
            success: true,
            message: 'Categories fetched successfully.',
            data: categories,
        });
    } catch (error) {
        next(error);
    }
};

const createCategory = async (req, res, next) => {
    try {
        const name = normalizeRequiredText({
            value: req.body?.name,
            fieldName: 'Category name',
            maxLength: VALIDATION_RULES.category.nameMax,
        });
        const description = normalizeOptionalText({
            value: req.body?.description,
            fieldName: 'Category description',
            maxLength: VALIDATION_RULES.category.descriptionMax,
        });

        const categoryId = await categoryModel.createCategory({
            name,
            description,
        });

        const category = await categoryModel.getCategoryById(categoryId);

        res.status(201).json({
            success: true,
            message: 'Category created successfully.',
            data: category,
        });
    } catch (error) {
        next(error);
    }
};

const updateCategory = async (req, res, next) => {
    try {
        const categoryId = Number(req.params.id);
        const name = normalizeRequiredText({
            value: req.body?.name,
            fieldName: 'Category name',
            maxLength: VALIDATION_RULES.category.nameMax,
        });
        const description = normalizeOptionalText({
            value: req.body?.description,
            fieldName: 'Category description',
            maxLength: VALIDATION_RULES.category.descriptionMax,
        });

        if (!Number.isInteger(categoryId) || categoryId <= 0) {
            const error = new Error('A valid category id is required.');
            error.statusCode = 400;
            throw error;
        }

        const affectedRows = await categoryModel.updateCategory({
            categoryId,
            name,
            description,
        });
        if (!affectedRows) {
            const error = new Error('Category not found.');
            error.statusCode = 404;
            throw error;
        }

        const category = await categoryModel.getCategoryById(categoryId);
        res.json({
            success: true,
            message: 'Category updated successfully.',
            data: category,
        });
    } catch (error) {
        next(error);
    }
};

const deactivateCategory = async (req, res, next) => {
    try {
        const categoryId = Number(req.params.id);
        if (!Number.isInteger(categoryId) || categoryId <= 0) {
            const error = new Error('A valid category id is required.');
            error.statusCode = 400;
            throw error;
        }

        const affectedRows = await categoryModel.setCategoryActiveStatus({
            categoryId,
            isActive: false,
        });
        if (!affectedRows) {
            const error = new Error('Category not found.');
            error.statusCode = 404;
            throw error;
        }

        const category = await categoryModel.getCategoryById(categoryId);
        res.json({
            success: true,
            message: 'Category deactivated successfully.',
            data: category,
        });
    } catch (error) {
        next(error);
    }
};

const restoreCategory = async (req, res, next) => {
    try {
        const categoryId = Number(req.params.id);
        if (!Number.isInteger(categoryId) || categoryId <= 0) {
            const error = new Error('A valid category id is required.');
            error.statusCode = 400;
            throw error;
        }

        const affectedRows = await categoryModel.setCategoryActiveStatus({
            categoryId,
            isActive: true,
        });
        if (!affectedRows) {
            const error = new Error('Category not found.');
            error.statusCode = 404;
            throw error;
        }

        const category = await categoryModel.getCategoryById(categoryId);
        res.json({
            success: true,
            message: 'Category restored successfully.',
            data: category,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCategories,
    createCategory,
    updateCategory,
    deactivateCategory,
    restoreCategory,
};
