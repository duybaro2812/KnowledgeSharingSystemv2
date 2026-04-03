const { getPool, sql } = require('../utils/db');

const getDocumentForEngagement = async (documentId) => {
    const pool = getPool();

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
