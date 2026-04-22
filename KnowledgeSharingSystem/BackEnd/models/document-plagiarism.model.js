const { getPool, sql, isPostgresClient } = require('../utils/db');

const hasTextArtifactsTable = async () => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT to_regclass('public.document_text_artifacts') IS NOT NULL AS ok;
            `
        );
        return Boolean(result.rows?.[0]?.ok);
    }

    const result = await pool.request().query(`
        SELECT 1 AS ok
        WHERE OBJECT_ID(N'dbo.DocumentTextArtifacts', N'U') IS NOT NULL;
    `);

    return Boolean(result.recordset?.[0]?.ok);
};

const upsertDocumentTextArtifact = async ({
    documentId,
    extractedText,
    normalizedText,
    tokenCount,
    extractionMethod,
    extractionWarning,
}) => {
    const tableExists = await hasTextArtifactsTable();
    if (!tableExists) {
        return false;
    }

    const pool = getPool();

    if (isPostgresClient()) {
        await pool.query(
            `
                INSERT INTO document_text_artifacts (
                    document_id,
                    extracted_text,
                    normalized_text,
                    token_count,
                    extraction_method,
                    extraction_warning,
                    updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (document_id)
                DO UPDATE SET
                    extracted_text = EXCLUDED.extracted_text,
                    normalized_text = EXCLUDED.normalized_text,
                    token_count = EXCLUDED.token_count,
                    extraction_method = EXCLUDED.extraction_method,
                    extraction_warning = EXCLUDED.extraction_warning,
                    updated_at = NOW();
            `,
            [
                documentId,
                extractedText || null,
                normalizedText || null,
                Number(tokenCount) || 0,
                extractionMethod || null,
                extractionWarning || null,
            ]
        );
        return true;
    }

    await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .input('extractedText', sql.NVarChar(sql.MAX), extractedText || null)
        .input('normalizedText', sql.NVarChar(sql.MAX), normalizedText || null)
        .input('tokenCount', sql.Int, Number(tokenCount) || 0)
        .input('extractionMethod', sql.NVarChar(30), extractionMethod || null)
        .input('extractionWarning', sql.NVarChar(255), extractionWarning || null)
        .query(`
            MERGE dbo.DocumentTextArtifacts AS target
            USING (
                SELECT
                    @documentId AS documentId,
                    @extractedText AS extractedText,
                    @normalizedText AS normalizedText,
                    @tokenCount AS tokenCount,
                    @extractionMethod AS extractionMethod,
                    @extractionWarning AS extractionWarning
            ) AS source
            ON target.documentId = source.documentId
            WHEN MATCHED THEN
                UPDATE SET
                    extractedText = source.extractedText,
                    normalizedText = source.normalizedText,
                    tokenCount = source.tokenCount,
                    extractionMethod = source.extractionMethod,
                    extractionWarning = source.extractionWarning,
                    updatedAt = SYSDATETIME()
            WHEN NOT MATCHED THEN
                INSERT (
                    documentId,
                    extractedText,
                    normalizedText,
                    tokenCount,
                    extractionMethod,
                    extractionWarning
                )
                VALUES (
                    source.documentId,
                    source.extractedText,
                    source.normalizedText,
                    source.tokenCount,
                    source.extractionMethod,
                    source.extractionWarning
                );
        `);

    return true;
};

const getTextSimilarityCandidates = async ({ documentId, limit = 100 }) => {
    const tableExists = await hasTextArtifactsTable();
    if (!tableExists) {
        return [];
    }

    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    d.document_id AS "documentId",
                    d.title,
                    d.file_hash AS "fileHash",
                    d.original_file_name AS "originalFileName",
                    d.status,
                    d.created_at AS "createdAt",
                    d.owner_user_id AS "ownerUserId",
                    u.name AS "ownerName",
                    ta.normalized_text AS "normalizedText",
                    ta.token_count AS "tokenCount"
                FROM documents d
                INNER JOIN document_text_artifacts ta ON ta.document_id = d.document_id
                INNER JOIN users u ON u.user_id = d.owner_user_id
                WHERE d.document_id <> $1
                  AND d.status IN ('pending', 'approved', 'rejected')
                ORDER BY d.created_at DESC, d.document_id DESC
                LIMIT $2;
            `,
            [documentId, limit]
        );
        return result.rows || [];
    }

    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .input('limit', sql.Int, limit)
        .query(`
            SELECT TOP (@limit)
                d.documentId,
                d.title,
                d.fileHash,
                d.originalFileName,
                d.status,
                d.createdAt,
                d.ownerUserId,
                u.name AS ownerName,
                ta.normalizedText,
                ta.tokenCount
            FROM dbo.Documents d
            INNER JOIN dbo.DocumentTextArtifacts ta ON ta.documentId = d.documentId
            INNER JOIN dbo.Users u ON u.userId = d.ownerUserId
            WHERE d.documentId <> @documentId
              AND d.status IN (N'pending', N'approved', N'rejected')
            ORDER BY d.createdAt DESC, d.documentId DESC;
        `);

    return result.recordset || [];
};

const getDocumentTextArtifact = async (documentId) => {
    const tableExists = await hasTextArtifactsTable();
    if (!tableExists) {
        return null;
    }

    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    document_id AS "documentId",
                    extracted_text AS "extractedText",
                    normalized_text AS "normalizedText",
                    token_count AS "tokenCount",
                    extraction_method AS "extractionMethod",
                    extraction_warning AS "extractionWarning",
                    created_at AS "createdAt",
                    updated_at AS "updatedAt"
                FROM document_text_artifacts
                WHERE document_id = $1;
            `,
            [documentId]
        );
        return result.rows?.[0] || null;
    }

    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .query(`
            SELECT
                documentId,
                extractedText,
                normalizedText,
                tokenCount,
                extractionMethod,
                extractionWarning,
                createdAt,
                updatedAt
            FROM dbo.DocumentTextArtifacts
            WHERE documentId = @documentId;
        `);

    return result.recordset?.[0] || null;
};

module.exports = {
    upsertDocumentTextArtifact,
    getTextSimilarityCandidates,
    getDocumentTextArtifact,
};
