const { getPool, sql, isPostgresClient } = require('../../../utils/db');
const {
    applyPointPolicySettings,
    buildPointPolicyResponse,
    getDefaultPointPolicySettings,
    validatePointPolicySetting,
} = require('../../../config/point-policy');

const getMyPointSummary = async (userId) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    u.user_id AS "userId",
                    u.username,
                    u.name,
                    u.points AS "currentPoints",
                    COALESCE(tx.total_earned, 0)::INT AS "totalEarned",
                    COALESCE(tx.total_spent, 0)::INT AS "totalSpent",
                    COALESCE(ev.pending_events, 0)::INT AS "pendingEvents",
                    COALESCE(ev.approved_events, 0)::INT AS "approvedEvents",
                    COALESCE(ev.rejected_events, 0)::INT AS "rejectedEvents"
                FROM users u
                LEFT JOIN LATERAL (
                    SELECT
                        SUM(CASE WHEN pt.points > 0 THEN pt.points ELSE 0 END) AS total_earned,
                        SUM(CASE WHEN pt.points < 0 THEN ABS(pt.points) ELSE 0 END) AS total_spent
                    FROM point_transactions pt
                    WHERE pt.user_id = u.user_id
                ) tx ON TRUE
                LEFT JOIN LATERAL (
                    SELECT
                        SUM(CASE WHEN pe.status = 'pending' THEN 1 ELSE 0 END) AS pending_events,
                        SUM(CASE WHEN pe.status = 'approved' THEN 1 ELSE 0 END) AS approved_events,
                        SUM(CASE WHEN pe.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_events
                    FROM point_events pe
                    WHERE pe.user_id = u.user_id
                ) ev ON TRUE
                WHERE u.user_id = $1;
            `,
            [userId]
        );
        return result.rows[0] || null;
    }

    const request = pool.request();
    request.input('userId', sql.Int, userId);

    const result = await request.query(`
        SELECT
            u.userId,
            u.username,
            u.name,
            u.points AS currentPoints,
            ISNULL(tx.totalEarned, 0) AS totalEarned,
            ISNULL(tx.totalSpent, 0) AS totalSpent,
            ISNULL(ev.pendingEvents, 0) AS pendingEvents,
            ISNULL(ev.approvedEvents, 0) AS approvedEvents,
            ISNULL(ev.rejectedEvents, 0) AS rejectedEvents
        FROM dbo.Users u
        OUTER APPLY (
            SELECT
                SUM(CASE WHEN pt.points > 0 THEN pt.points ELSE 0 END) AS totalEarned,
                SUM(CASE WHEN pt.points < 0 THEN ABS(pt.points) ELSE 0 END) AS totalSpent
            FROM dbo.PointTransactions pt
            WHERE pt.userId = u.userId
        ) tx
        OUTER APPLY (
            SELECT
                SUM(CASE WHEN pe.status = N'pending' THEN 1 ELSE 0 END) AS pendingEvents,
                SUM(CASE WHEN pe.status = N'approved' THEN 1 ELSE 0 END) AS approvedEvents,
                SUM(CASE WHEN pe.status = N'rejected' THEN 1 ELSE 0 END) AS rejectedEvents
            FROM dbo.PointEvents pe
            WHERE pe.userId = u.userId
        ) ev
        WHERE u.userId = @userId;
    `);

    return result.recordset[0] || null;
};

const getMyPointTransactions = async ({ userId, limit = 50 }) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    pt.transaction_id AS "transactionId",
                    pt.user_id AS "userId",
                    pt.transaction_type AS "transactionType",
                    pt.points,
                    pt.description,
                    pt.document_id AS "documentId",
                    d.title AS "documentTitle",
                    pt.answer_id AS "answerId",
                    pt.review_id AS "reviewId",
                    pt.created_at AS "createdAt"
                FROM point_transactions pt
                LEFT JOIN documents d ON d.document_id = pt.document_id
                WHERE pt.user_id = $1
                ORDER BY pt.transaction_id DESC
                LIMIT $2;
            `,
            [userId, limit]
        );
        return result.rows;
    }

    const request = pool.request();
    request.input('userId', sql.Int, userId);
    request.input('limit', sql.Int, limit);

    const result = await request.query(`
        SELECT TOP (@limit)
            pt.transactionId,
            pt.userId,
            pt.transactionType,
            pt.points,
            pt.description,
            pt.documentId,
            d.title AS documentTitle,
            pt.answerId,
            pt.reviewId,
            pt.createdAt
        FROM dbo.PointTransactions pt
        LEFT JOIN dbo.Documents d ON d.documentId = pt.documentId
        WHERE pt.userId = @userId
        ORDER BY pt.transactionId DESC;
    `);

    return result.recordset;
};

const getMyPointEvents = async ({ userId, status = null, limit = 50 }) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    pe.event_id AS "eventId",
                    pe.user_id AS "userId",
                    pe.event_type AS "eventType",
                    pe.points,
                    pe.status,
                    pe.document_id AS "documentId",
                    d.title AS "documentTitle",
                    pe.comment_id AS "commentId",
                    pe.qa_session_id AS "qaSessionId",
                    pe.source_user_id AS "sourceUserId",
                    pe.metadata,
                    pe.created_at AS "createdAt",
                    pe.reviewed_by_user_id AS "reviewedByUserId",
                    rv.name AS "reviewedByName",
                    pe.review_note AS "reviewNote",
                    pe.reviewed_at AS "reviewedAt"
                FROM point_events pe
                LEFT JOIN documents d ON d.document_id = pe.document_id
                LEFT JOIN users rv ON rv.user_id = pe.reviewed_by_user_id
                WHERE pe.user_id = $1
                  AND ($2::TEXT IS NULL OR pe.status = $2)
                ORDER BY pe.event_id DESC
                LIMIT $3;
            `,
            [userId, status, limit]
        );
        return result.rows;
    }

    const request = pool.request();
    request.input('userId', sql.Int, userId);
    request.input('status', sql.NVarChar(20), status);
    request.input('limit', sql.Int, limit);

    const result = await request.query(`
        SELECT TOP (@limit)
            pe.eventId,
            pe.userId,
            pe.eventType,
            pe.points,
            pe.status,
            pe.documentId,
            d.title AS documentTitle,
            pe.commentId,
            pe.qaSessionId,
            pe.sourceUserId,
            pe.metadata,
            pe.createdAt,
            pe.reviewedByUserId,
            rv.name AS reviewedByName,
            pe.reviewNote,
            pe.reviewedAt
        FROM dbo.PointEvents pe
        LEFT JOIN dbo.Documents d ON d.documentId = pe.documentId
        LEFT JOIN dbo.Users rv ON rv.userId = pe.reviewedByUserId
        WHERE pe.userId = @userId
          AND (@status IS NULL OR pe.status = @status)
        ORDER BY pe.eventId DESC;
    `);

    return result.recordset;
};

const ensurePointPolicySettingsTable = async (client = getPool()) => {
    if (!isPostgresClient()) return;

    await client.query(`
        CREATE TABLE IF NOT EXISTS point_policy_settings (
            setting_key VARCHAR(80) PRIMARY KEY,
            setting_value INTEGER NOT NULL CHECK (setting_value BETWEEN -100000 AND 100000),
            category VARCHAR(50) NOT NULL DEFAULT 'custom',
            label VARCHAR(120) NULL,
            description VARCHAR(255) NULL,
            content TEXT NULL,
            unit VARCHAR(40) NULL,
            min_value INTEGER NOT NULL DEFAULT -100000,
            max_value INTEGER NOT NULL DEFAULT 100000,
            updated_by_user_id INTEGER NULL REFERENCES users(user_id) ON DELETE SET NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);
    await client.query(`ALTER TABLE point_policy_settings ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'custom';`);
    await client.query(`ALTER TABLE point_policy_settings ADD COLUMN IF NOT EXISTS label VARCHAR(120) NULL;`);
    await client.query(`ALTER TABLE point_policy_settings ADD COLUMN IF NOT EXISTS content TEXT NULL;`);
    await client.query(`ALTER TABLE point_policy_settings ADD COLUMN IF NOT EXISTS unit VARCHAR(40) NULL;`);
    await client.query(`ALTER TABLE point_policy_settings ADD COLUMN IF NOT EXISTS min_value INTEGER NOT NULL DEFAULT -100000;`);
    await client.query(`ALTER TABLE point_policy_settings ADD COLUMN IF NOT EXISTS max_value INTEGER NOT NULL DEFAULT 100000;`);
    await client.query(`ALTER TABLE point_policy_settings ALTER COLUMN setting_value TYPE INTEGER;`);
    await client.query(`
        DO $$
        DECLARE constraint_record RECORD;
        BEGIN
            FOR constraint_record IN
                SELECT conname
                FROM pg_constraint
                WHERE conrelid = 'point_policy_settings'::regclass
                  AND contype = 'c'
                  AND pg_get_constraintdef(oid) ILIKE '%setting_value%'
            LOOP
                EXECUTE format('ALTER TABLE point_policy_settings DROP CONSTRAINT %I', constraint_record.conname);
            END LOOP;
        END $$;
    `);
    await client.query(`
        ALTER TABLE point_policy_settings
        ADD CONSTRAINT ck_point_policy_settings_value
        CHECK (setting_value BETWEEN -100000 AND 100000);
    `);

    const defaults = getDefaultPointPolicySettings();
    for (const setting of defaults) {
        await client.query(
            `
                INSERT INTO point_policy_settings (
                    setting_key,
                    setting_value,
                    category,
                    label,
                    description,
                    unit,
                    min_value,
                    max_value
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (setting_key) DO NOTHING;
            `,
            [
                setting.key,
                setting.value,
                setting.category,
                setting.label,
                setting.description,
                setting.unit,
                setting.min,
                setting.max,
            ]
        );

        await client.query(
            `
                UPDATE point_policy_settings
                SET
                    category = $2,
                    label = $3,
                    description = $4,
                    unit = $5,
                    min_value = $6,
                    max_value = $7
                WHERE setting_key = $1
                  AND updated_by_user_id IS NULL
                  AND setting_key NOT LIKE 'custom.%';
            `,
            [
                setting.key,
                setting.category,
                setting.label,
                setting.description,
                setting.unit,
                setting.min,
                setting.max,
            ]
        );
    }
};

const selectPointPolicySettings = async (client = getPool()) => {
    const result = await client.query(`
        SELECT
            setting_key AS "settingKey",
            setting_value AS "settingValue",
            category,
            label,
            description,
            content,
            unit,
            min_value AS "min",
            max_value AS "max",
            updated_by_user_id AS "updatedByUserId",
            updated_at AS "updatedAt"
        FROM point_policy_settings
        ORDER BY setting_key ASC;
    `);
    return result.rows;
};

const buildPolicyResponseFromRows = (rows) => {
    const customSettings = rows
        .filter((row) => String(row.settingKey || '').startsWith('custom.'))
        .map((row) => ({
            key: row.settingKey,
            value: row.settingValue,
            category: row.category || 'custom',
            label: row.label || row.settingKey,
            description: row.description || '',
            content: row.content || '',
            unit: row.unit || 'điểm',
            min: row.min,
            max: row.max,
        }));
    const response = buildPointPolicyResponse(customSettings);
    const rowByKey = new Map(rows.map((row) => [row.settingKey, row]));
    response.settings = response.settings.map((setting) => {
        const row = rowByKey.get(setting.key);
        if (!row) return setting;
        return {
            ...setting,
            category: row.category || setting.category,
            label: row.label || setting.label,
            description: row.description || setting.description,
            content: row.content || setting.content || '',
            unit: row.unit || setting.unit || 'điểm',
            min: Number(row.min ?? setting.min),
            max: Number(row.max ?? setting.max),
            value: Number(row.settingValue ?? setting.value),
        };
    });
    return response;
};

const getPointPolicy = async () => {
    if (!isPostgresClient()) return buildPointPolicyResponse();

    await ensurePointPolicySettingsTable();
    const rows = await selectPointPolicySettings();
    applyPointPolicySettings(
        rows.map((row) => ({
            key: row.settingKey,
            value: row.settingValue,
            category: row.category,
            label: row.label,
            description: row.description,
            content: row.content,
            unit: row.unit,
            min: row.min,
            max: row.max,
        }))
    );
    return buildPolicyResponseFromRows(rows);
};

const updatePointPolicy = async ({ settings, updatedByUserId }) => {
    if (!isPostgresClient()) return buildPointPolicyResponse();
    if (!Array.isArray(settings) || settings.length === 0) {
        const error = new Error('settings must be a non-empty array.');
        error.statusCode = 400;
        throw error;
    }

    const pool = getPool();
    await ensurePointPolicySettingsTable(pool);
    const existingRows = await selectPointPolicySettings(pool);
    const existingSettingKeys = new Set(existingRows.map((row) => String(row.settingKey || '').trim()));

    const normalizedSettings = settings.map((setting) => {
        const key = String(setting?.key || setting?.settingKey || '').trim();
        if (!existingSettingKeys.has(key)) {
            const error = new Error('Luật này chưa có trong cơ sở dữ liệu, không thể áp dụng.');
            error.statusCode = 400;
            throw error;
        }

        const rawValue = setting?.value ?? setting?.settingValue;
        const { definition, value } = validatePointPolicySetting(key, rawValue, {
            allowCustom: key.startsWith('custom.'),
            category: setting?.category,
            label: setting?.label,
            description: setting?.description,
            content: setting?.content,
            unit: setting?.unit,
            min: setting?.min,
            max: setting?.max,
        });
        return {
            key: definition.key,
            value,
            category: definition.category,
            label: definition.label,
            description: definition.description,
            content: definition.content,
            unit: definition.unit,
            min: definition.min,
            max: definition.max,
        };
    });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await ensurePointPolicySettingsTable(client);

        for (const setting of normalizedSettings) {
            await client.query(
                `
                    INSERT INTO point_policy_settings (
                        setting_key,
                        setting_value,
                        category,
                        label,
                        description,
                        content,
                        unit,
                        min_value,
                        max_value,
                        updated_by_user_id,
                        updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
                    ON CONFLICT (setting_key)
                    DO UPDATE SET
                        setting_value = EXCLUDED.setting_value,
                        category = EXCLUDED.category,
                        label = EXCLUDED.label,
                        description = EXCLUDED.description,
                        content = EXCLUDED.content,
                        unit = EXCLUDED.unit,
                        min_value = EXCLUDED.min_value,
                        max_value = EXCLUDED.max_value,
                        updated_by_user_id = EXCLUDED.updated_by_user_id,
                        updated_at = NOW();
                `,
                [
                    setting.key,
                    setting.value,
                    setting.category,
                    setting.label,
                    setting.description,
                    setting.content,
                    setting.unit,
                    setting.min,
                    setting.max,
                    updatedByUserId || null,
                ]
            );
        }

        const rows = await selectPointPolicySettings(client);
        await client.query('COMMIT');

        applyPointPolicySettings(
            rows.map((row) => ({
                key: row.settingKey,
                value: row.settingValue,
                category: row.category,
                label: row.label,
                description: row.description,
                content: row.content,
                unit: row.unit,
                min: row.min,
                max: row.max,
            }))
        );

        return buildPolicyResponseFromRows(rows);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const deletePointPolicySetting = async ({ settingKey }) => {
    if (!isPostgresClient()) return buildPointPolicyResponse();
    const normalizedKey = String(settingKey || '').trim();
    if (!normalizedKey) {
        const error = new Error('settingKey is required.');
        error.statusCode = 400;
        throw error;
    }

    await ensurePointPolicySettingsTable();
    await getPool().query(
        `DELETE FROM point_policy_settings WHERE setting_key = $1;`,
        [normalizedKey]
    );

    return getPointPolicy();
};

module.exports = {
    getMyPointSummary,
    getMyPointTransactions,
    getMyPointEvents,
    ensurePointPolicySettingsTable,
    getPointPolicy,
    updatePointPolicy,
    deletePointPolicySetting,
};
