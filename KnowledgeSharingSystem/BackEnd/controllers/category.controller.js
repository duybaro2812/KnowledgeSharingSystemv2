const categoryModel = require('../models/category.model');
const { VALIDATION_RULES } = require('../config/validation-rules');
const {
    normalizeRequiredText,
    normalizeOptionalText,
} = require('../utils/input-sanitizer');

const getCategories = async (req, res, next) => {
    try {
        const keyword = normalizeOptionalText({
            value: req.query?.keyword,
            maxLength: VALIDATION_RULES.category.nameMax,
        });

        const categories = await categoryModel.getActiveCategories({
            keyword,
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

module.exports = {
    getCategories,
    createCategory,
};
