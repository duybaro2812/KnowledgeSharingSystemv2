const { getPool, sql, isPostgresClient } = require('../../../utils/db');

const getActiveCategories = async ({ keyword = null, includeInactive = false } = {}) => {
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
                WHERE ($2::BOOLEAN = TRUE OR c.is_active = TRUE)
                  AND ($1::TEXT IS NULL OR c.name ILIKE ('%' || $1 || '%'))
                ORDER BY c.is_active DESC, "documentCount" DESC, c.name ASC;
            `,
            [keyword || null, Boolean(includeInactive)]
        );

        return result.rows;
    }

    const result = await pool
        .request()
        .input('keyword', sql.NVarChar(100), keyword || null)
        .input('includeInactive', sql.Bit, includeInactive ? 1 : 0)
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
        WHERE (@includeInactive = 1 OR c.isActive = 1)
          AND (
                @keyword IS NULL
                OR c.name LIKE N'%' + @keyword + N'%'
              )
        ORDER BY c.isActive DESC, documentCount DESC, c.name ASC;
    `);

    return result.recordset;
};

const updateCategory = async ({ categoryId, name, description }) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const duplicate = await pool.query(
            `
                SELECT category_id
                FROM categories
                WHERE LOWER(name) = LOWER($1)
                  AND category_id <> $2
                LIMIT 1;
            `,
            [name, categoryId]
        );
        if (duplicate.rows[0]) {
            const error = new Error('Category already exists.');
            error.statusCode = 409;
            throw error;
        }

        const result = await pool.query(
            `
                UPDATE categories
                SET
                    name = $2,
                    description = $3
                WHERE category_id = $1
                RETURNING category_id AS "categoryId";
            `,
            [categoryId, name, description || null]
        );
        return Number(result.rowCount || 0);
    }

    const duplicate = await pool
        .request()
        .input('categoryId', sql.Int, categoryId)
        .input('name', sql.NVarChar(100), name)
        .query(`
            SELECT TOP 1 categoryId
            FROM dbo.Categories
            WHERE name = @name
              AND categoryId <> @categoryId;
        `);
    if (duplicate.recordset[0]) {
        const error = new Error('Category already exists.');
        error.statusCode = 409;
        throw error;
    }

    const result = await pool
        .request()
        .input('categoryId', sql.Int, categoryId)
        .input('name', sql.NVarChar(100), name)
        .input('description', sql.NVarChar(255), description || null)
        .query(`
            UPDATE dbo.Categories
            SET
                name = @name,
                description = @description
            WHERE categoryId = @categoryId;

            SELECT @@ROWCOUNT AS affectedRows;
        `);

    return result.recordset[0]?.affectedRows || 0;
};

const setCategoryActiveStatus = async ({ categoryId, isActive }) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                UPDATE categories
                SET is_active = $2
                WHERE category_id = $1
                RETURNING category_id;
            `,
            [categoryId, Boolean(isActive)]
        );
        return Number(result.rowCount || 0);
    }

    const result = await pool
        .request()
        .input('categoryId', sql.Int, categoryId)
        .input('isActive', sql.Bit, isActive ? 1 : 0)
        .query(`
            UPDATE dbo.Categories
            SET isActive = @isActive
            WHERE categoryId = @categoryId;

            SELECT @@ROWCOUNT AS affectedRows;
        `);

    return result.recordset[0]?.affectedRows || 0;
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
    updateCategory,
    setCategoryActiveStatus,
    getCategoryById,
};
