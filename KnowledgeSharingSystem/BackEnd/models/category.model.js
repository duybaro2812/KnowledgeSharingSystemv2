const { getPool, sql } = require('../utils/db');

const getActiveCategories = async ({ keyword = null } = {}) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('keyword', sql.NVarChar(100), keyword || null)
        .query(`
        SELECT
            c.categoryId,
            c.name,
            c.description,
            c.isActive,
            (
                SELECT COUNT(DISTINCT dc.documentId)
                FROM dbo.DocumentCategories dc
                INNER JOIN dbo.Documents d ON d.documentId = dc.documentId
                WHERE dc.categoryId = c.categoryId
                  AND d.status = N'approved'
            ) AS documentCount
        FROM dbo.Categories c
        WHERE c.isActive = 1
          AND (
                @keyword IS NULL
                OR c.name LIKE N'%' + @keyword + N'%'
              )
        ORDER BY documentCount DESC, c.name ASC;
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
                c.categoryId,
                c.name,
                c.description,
                c.isActive,
                (
                    SELECT COUNT(DISTINCT dc.documentId)
                    FROM dbo.DocumentCategories dc
                    INNER JOIN dbo.Documents d ON d.documentId = dc.documentId
                    WHERE dc.categoryId = c.categoryId
                      AND d.status = N'approved'
                ) AS documentCount
            FROM dbo.Categories c
            WHERE c.categoryId = @categoryId;
        `);

    return result.recordset[0] || null;
};

module.exports = {
    getActiveCategories,
    createCategory,
    getCategoryById,
};
