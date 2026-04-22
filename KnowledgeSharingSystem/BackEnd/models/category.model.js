const { getPool, sql, isPostgresClient } = require('../utils/db');

const getActiveCategories = async ({ keyword = null } = {}) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    c.category_id AS "categoryId",
                    c.name,
                    c.description,
                    c.is_active AS "isActive",
                    (
                        SELECT COUNT(DISTINCT dc.document_id)
                        FROM document_categories dc
                        INNER JOIN documents d ON d.document_id = dc.document_id
                        WHERE dc.category_id = c.category_id
                          AND d.status = 'approved'
                    )::INT AS "documentCount"
                FROM categories c
                WHERE c.is_active = TRUE
                  AND ($1::TEXT IS NULL OR c.name ILIKE ('%' || $1 || '%'))
                ORDER BY "documentCount" DESC, c.name ASC;
            `,
            [keyword || null]
        );

        return result.rows;
    }

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

    if (isPostgresClient()) {
        const existingResult = await pool.query(
            `
                SELECT category_id AS "categoryId"
                FROM categories
                WHERE LOWER(name) = LOWER($1)
                LIMIT 1;
            `,
            [name]
        );

        if (existingResult.rows.length > 0) {
            const error = new Error('Category already exists.');
            error.statusCode = 409;
            throw error;
        }

        const insertResult = await pool.query(
            `
                INSERT INTO categories (name, description)
                VALUES ($1, $2)
                RETURNING category_id AS "categoryId";
            `,
            [name, description || null]
        );

        return insertResult.rows[0].categoryId;
    }

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    c.category_id AS "categoryId",
                    c.name,
                    c.description,
                    c.is_active AS "isActive",
                    (
                        SELECT COUNT(DISTINCT dc.document_id)
                        FROM document_categories dc
                        INNER JOIN documents d ON d.document_id = dc.document_id
                        WHERE dc.category_id = c.category_id
                          AND d.status = 'approved'
                    )::INT AS "documentCount"
                FROM categories c
                WHERE c.category_id = $1;
            `,
            [categoryId]
        );

        return result.rows[0] || null;
    }

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
