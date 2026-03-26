const categoryModel = require('../models/category.model');

const getCategories = async (req, res, next) => {
    try {
        const categories = await categoryModel.getActiveCategories();

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
        const { name, description } = req.body;
        const trimmedName = typeof name === 'string' ? name.trim() : '';

        if (!trimmedName) {
            const error = new Error('Category name is required.');
            error.statusCode = 400;
            throw error;
        }

        const categoryId = await categoryModel.createCategory({
            name: trimmedName,
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
