const { getPool, sql, isPostgresClient } = require('../utils/db');

const createAdminActionLog = async ({
    actorUserId,
    targetUserId,
    actionType,
    oldValue = null,
    newValue = null,
    note = null,
}) => {
    const pool = getPool();

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                INSERT INTO admin_action_logs (
                    actor_user_id,
                    target_user_id,
                    action_type,
                    old_value,
                    new_value,
                    note
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING
                    log_id AS "logId",
                    actor_user_id AS "actorUserId",
                    target_user_id AS "targetUserId",
                    action_type AS "actionType",
                    old_value AS "oldValue",
                    new_value AS "newValue",
                    note,
                    created_at AS "createdAt";
            `,
            [
                actorUserId,
                targetUserId,
                actionType,
                oldValue ? JSON.stringify(oldValue) : null,
                newValue ? JSON.stringify(newValue) : null,
                note,
            ]
        );

        return result.rows[0] || null;
    }

    const result = await pool
        .request()
        .input('actorUserId', sql.Int, actorUserId)
        .input('targetUserId', sql.Int, targetUserId)
        .input('actionType', sql.NVarChar(50), actionType)
        .input('oldValue', sql.NVarChar(sql.MAX), oldValue ? JSON.stringify(oldValue) : null)
        .input('newValue', sql.NVarChar(sql.MAX), newValue ? JSON.stringify(newValue) : null)
        .input('note', sql.NVarChar(255), note)
        .query(`
            INSERT INTO dbo.AdminActionLogs (
                actorUserId,
                targetUserId,
                actionType,
                oldValue,
                newValue,
                note
            )
            OUTPUT
                inserted.logId,
                inserted.actorUserId,
                inserted.targetUserId,
                inserted.actionType,
                inserted.oldValue,
                inserted.newValue,
                inserted.note,
                inserted.createdAt
            VALUES (
                @actorUserId,
                @targetUserId,
                @actionType,
                @oldValue,
                @newValue,
                @note
            );
        `);

    return result.recordset[0] || null;
};

const getAdminActionLogs = async ({ page = 1, pageSize = 30 }) => {
    const pool = getPool();
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 30;
    const offset = (safePage - 1) * safePageSize;

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    l.log_id AS "logId",
                    l.actor_user_id AS "actorUserId",
                    actor.name AS "actorName",
                    actor.username AS "actorUsername",
                    l.target_user_id AS "targetUserId",
                    target_user.name AS "targetName",
                    target_user.username AS "targetUsername",
                    l.action_type AS "actionType",
                    l.old_value AS "oldValue",
                    l.new_value AS "newValue",
                    l.note,
                    l.created_at AS "createdAt"
                FROM admin_action_logs l
                INNER JOIN users actor ON actor.user_id = l.actor_user_id
                INNER JOIN users target_user ON target_user.user_id = l.target_user_id
                ORDER BY l.log_id DESC
                OFFSET $1 LIMIT $2;
            `,
            [offset, safePageSize]
        );

        const countResult = await pool.query(`SELECT COUNT(1)::INT AS "totalRows" FROM admin_action_logs;`);
        const rows = result.rows || [];
        const totalRows = Number(countResult.rows?.[0]?.totalRows || 0);

        return {
            rows,
            page: safePage,
            pageSize: safePageSize,
            totalRows,
            totalPages: Math.max(1, Math.ceil(totalRows / safePageSize)),
        };
    }

    const result = await pool
        .request()
        .input('offset', sql.Int, offset)
        .input('pageSize', sql.Int, safePageSize)
        .query(`
            SELECT
                l.logId,
                l.actorUserId,
                actor.name AS actorName,
                actor.username AS actorUsername,
                l.targetUserId,
                targetUser.name AS targetName,
                targetUser.username AS targetUsername,
                l.actionType,
                l.oldValue,
                l.newValue,
                l.note,
                l.createdAt
            FROM dbo.AdminActionLogs l
            INNER JOIN dbo.Users actor ON actor.userId = l.actorUserId
            INNER JOIN dbo.Users targetUser ON targetUser.userId = l.targetUserId
            ORDER BY l.logId DESC
            OFFSET @offset ROWS
            FETCH NEXT @pageSize ROWS ONLY;

            SELECT COUNT(1) AS totalRows
            FROM dbo.AdminActionLogs;
        `);

    const rows = result.recordsets?.[0] || [];
    const totalRows = result.recordsets?.[1]?.[0]?.totalRows || 0;

    return {
        rows,
        page: safePage,
        pageSize: safePageSize,
        totalRows,
        totalPages: Math.max(1, Math.ceil(totalRows / safePageSize)),
    };
};

module.exports = {
    createAdminActionLog,
    getAdminActionLogs,
};
