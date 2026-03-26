const { getPool, sql } = require('../utils/db');

const getActiveCategories = async () => {
    const pool = getPool();

    const result = await pool.request().query(`
        SELECT
            categoryId,
            name,
            description,
            isActive
        FROM dbo.Categories
        WHERE isActive = 1
        ORDER BY name ASC;
    `);

    return result.recordset;
};

const createCategory = async ({ name, description }) => {
    const pool = getPool();

    const existingCategoryResult = await pool
        .request()
        .input('name', sql.NVarChar(100), name)
        .query(`
            SELECT TOP 1
                categoryId
            FROM dbo.Categories
            WHERE name = @name;
        `);

    if (existingCategoryResult.recordset.length > 0) {
        const error = new Error('Category already exists.');
        error.statusCode = 409;
        throw error;
    }

    const insertResult = await pool
        .request()
        .input('name', sql.NVarChar(100), name)
        .input('description', sql.NVarChar(255), description || null)
        .query(`
            INSERT INTO dbo.Categories (name, description)
            VALUES (@name, @description);

            SELECT CAST(SCOPE_IDENTITY() AS INT) AS categoryId;
        `);

    return insertResult.recordset[0].categoryId;
};

const getCategoryById = async (categoryId) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('categoryId', sql.Int, categoryId)
        .query(`
            SELECT
                categoryId,
                name,
                description,
                isActive
            FROM dbo.Categories
            WHERE categoryId = @categoryId;
        `);

    return result.recordset[0] || null;
};

module.exports = {
    getActiveCategories,
    createCategory,
    getCategoryById,
};
