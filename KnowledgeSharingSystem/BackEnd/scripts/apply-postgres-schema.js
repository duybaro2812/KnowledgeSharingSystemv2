require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const usePrimaryAsDst = (process.env.DB_CLIENT || 'postgres').trim().toLowerCase() === 'postgres';

const targetConfig = {
    host:
        process.env.MIGRATION_DST_DB_SERVER ||
        (usePrimaryAsDst ? process.env.DB_SERVER : null) ||
        'localhost',
    port: Number(
        process.env.MIGRATION_DST_DB_PORT ||
            (usePrimaryAsDst ? process.env.DB_PORT : null) ||
            5432
    ),
    database:
        process.env.MIGRATION_DST_DB_NAME ||
        (usePrimaryAsDst ? process.env.DB_NAME : null) ||
        'KSS',
    user:
        process.env.MIGRATION_DST_DB_USER ||
        (usePrimaryAsDst ? process.env.DB_USER : null) ||
        'postgres',
    password:
        process.env.MIGRATION_DST_DB_PASSWORD ||
        (usePrimaryAsDst ? process.env.DB_PASSWORD : null) ||
        '',
    ssl:
        process.env.MIGRATION_DST_DB_ENCRYPT === 'true'
            ? { rejectUnauthorized: process.env.MIGRATION_DST_DB_TRUST_SERVER_CERTIFICATE !== 'true' }
            : false,
    max: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
};

const schemaPath = path.resolve(__dirname, '../sql/postgres/001_schema.sql');

const run = async () => {
    let pgPool;

    try {
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file not found: ${schemaPath}`);
        }

        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        pgPool = new Pool(targetConfig);
        await pgPool.query('SELECT 1 AS ok;');
        await pgPool.query(schemaSql);

        console.table({
            status: 'success',
            action: 'apply-postgres-schema',
            database: targetConfig.database,
            schemaFile: schemaPath,
        });
    } catch (error) {
        console.error('[apply-postgres-schema] failed:', error.message);
        process.exitCode = 1;
    } finally {
        if (pgPool) await pgPool.end();
    }
};

if (require.main === module) {
    run();
}

module.exports = { run };
