const { getPool, sql, isPostgresClient } = require('../utils/db');

const getDocumentForEngagement = async (documentId) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    d.document_id AS "documentId",
                    d.title,
                    d.owner_user_id AS "ownerUserId",
                    d.status
                FROM documents d
                WHERE d.document_id = $1;
            `,
            [documentId]
        );

        return result.rows[0] || null;
    }

    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .query(`
            SELECT
                d.documentId,
                d.title,
                d.ownerUserId,
                d.status
            FROM dbo.Documents d
            WHERE d.documentId = @documentId;
        `);

    return result.recordset[0] || null;
};

const getDocumentEngagement = async ({ documentId, userId }) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    COALESCE(SUM(CASE WHEN dr.reaction_type = 'like' THEN 1 ELSE 0 END), 0)::INT AS "likeCount",
                    COALESCE(SUM(CASE WHEN dr.reaction_type = 'dislike' THEN 1 ELSE 0 END), 0)::INT AS "dislikeCount",
                    MAX(CASE WHEN dr.user_id = $2 THEN dr.reaction_type END) AS "currentReaction",
                    COALESCE(MAX(CASE WHEN sd.user_id = $2 THEN 1 ELSE 0 END), 0)::INT AS "isSaved"
                FROM documents d
                LEFT JOIN document_reactions dr ON dr.document_id = d.document_id
                LEFT JOIN saved_documents sd ON sd.document_id = d.document_id
                WHERE d.document_id = $1
                GROUP BY d.document_id;
            `,
            [documentId, userId]
        );

        const row = result.rows[0] || {
            likeCount: 0,
            dislikeCount: 0,
            currentReaction: null,
            isSaved: 0,
        };

        return {
            likeCount: Number(row.likeCount) || 0,
            dislikeCount: Number(row.dislikeCount) || 0,
            currentReaction: row.currentReaction || null,
            isSaved: Number(row.isSaved) === 1,
        };
    }

    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .input('userId', sql.Int, userId)
        .query(`
            SELECT
                likeCount = SUM(CASE WHEN dr.reactionType = N'like' THEN 1 ELSE 0 END),
                dislikeCount = SUM(CASE WHEN dr.reactionType = N'dislike' THEN 1 ELSE 0 END),
                currentReaction = MAX(CASE WHEN dr.userId = @userId THEN dr.reactionType END),
                isSaved = CAST(MAX(CASE WHEN sd.userId = @userId THEN 1 ELSE 0 END) AS BIT)
            FROM dbo.Documents d
            LEFT JOIN dbo.DocumentReactions dr ON dr.documentId = d.documentId
            LEFT JOIN dbo.SavedDocuments sd ON sd.documentId = d.documentId
            WHERE d.documentId = @documentId
            GROUP BY d.documentId;
        `);

    const row = result.recordset[0] || {
        likeCount: 0,
        dislikeCount: 0,
        currentReaction: null,
        isSaved: false,
    };

    return {
        likeCount: Number(row.likeCount) || 0,
        dislikeCount: Number(row.dislikeCount) || 0,
        currentReaction: row.currentReaction || null,
        isSaved: Boolean(row.isSaved),
    };
};

const upsertReaction = async ({ documentId, userId, reactionType }) => {
    const pool = getPool();

    if (isPostgresClient()) {
        if (!reactionType) {
            await pool.query(
                `
                    DELETE FROM document_reactions
                    WHERE document_id = $1
                      AND user_id = $2;
                `,
                [documentId, userId]
            );
            return;
        }

        await pool.query(
            `
                INSERT INTO document_reactions (document_id, user_id, reaction_type)
                VALUES ($1, $2, $3)
                ON CONFLICT (document_id, user_id)
                DO UPDATE
                SET
                    reaction_type = EXCLUDED.reaction_type,
                    updated_at = NOW();
            `,
            [documentId, userId, reactionType]
        );
        return;
    }

    if (!reactionType) {
        await pool
            .request()
            .input('documentId', sql.Int, documentId)
            .input('userId', sql.Int, userId)
            .query(`
                DELETE FROM dbo.DocumentReactions
                WHERE documentId = @documentId
                  AND userId = @userId;
            `);

        return;
    }

    await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .input('userId', sql.Int, userId)
        .input('reactionType', sql.NVarChar(20), reactionType)
        .query(`
            MERGE dbo.DocumentReactions AS target
            USING (
                SELECT
                    @documentId AS documentId,
                    @userId AS userId,
                    @reactionType AS reactionType
            ) AS source
            ON target.documentId = source.documentId
               AND target.userId = source.userId
            WHEN MATCHED THEN
                UPDATE
                SET
                    reactionType = source.reactionType,
                    updatedAt = SYSDATETIME()
            WHEN NOT MATCHED THEN
                INSERT (documentId, userId, reactionType)
                VALUES (source.documentId, source.userId, source.reactionType);
        `);
};

const setSavedDocument = async ({ documentId, userId, isSaved }) => {
    const pool = getPool();

    if (isPostgresClient()) {
        if (isSaved) {
            await pool.query(
                `
                    INSERT INTO saved_documents (document_id, user_id)
                    VALUES ($1, $2)
                    ON CONFLICT (document_id, user_id) DO NOTHING;
                `,
                [documentId, userId]
            );
            return;
        }

        await pool.query(
            `
                DELETE FROM saved_documents
                WHERE document_id = $1
                  AND user_id = $2;
            `,
            [documentId, userId]
        );
        return;
    }

    if (isSaved) {
        await pool
            .request()
            .input('documentId', sql.Int, documentId)
            .input('userId', sql.Int, userId)
            .query(`
                IF NOT EXISTS (
                    SELECT 1
                    FROM dbo.SavedDocuments
                    WHERE documentId = @documentId
                      AND userId = @userId
                )
                BEGIN
                    INSERT INTO dbo.SavedDocuments (documentId, userId)
                    VALUES (@documentId, @userId);
                END;
            `);

        return;
    }

    await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .input('userId', sql.Int, userId)
        .query(`
            DELETE FROM dbo.SavedDocuments
            WHERE documentId = @documentId
              AND userId = @userId;
        `);
};

module.exports = {
    getDocumentForEngagement,
    getDocumentEngagement,
    upsertReaction,
    setSavedDocument,
};
