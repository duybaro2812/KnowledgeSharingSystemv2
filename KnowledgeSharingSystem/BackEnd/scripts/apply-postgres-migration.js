require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const usePrimaryAsDst = (process.env.DB_CLIENT || 'postgres').trim().toLowerCase() === 'postgres';
const databaseUrl = (process.env.MIGRATION_DST_DATABASE_URL || process.env.DATABASE_URL || '').trim();

const targetConfig = databaseUrl
    ? {
          connectionString: databaseUrl,
          ssl:
              process.env.MIGRATION_DST_DB_ENCRYPT === 'true' || process.env.DB_ENCRYPT === 'true'
                  ? {
                        rejectUnauthorized:
                            process.env.MIGRATION_DST_DB_TRUST_SERVER_CERTIFICATE !== 'true' &&
                            process.env.DB_TRUST_SERVER_CERTIFICATE !== 'true',
                    }
                  : false,
          max: 2,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 30000,
      }
    : {
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
                  ? {
                        rejectUnauthorized:
                            process.env.MIGRATION_DST_DB_TRUST_SERVER_CERTIFICATE !== 'true',
                    }
                  : false,
          max: 2,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 30000,
      };

const migrationArg = process.argv[2];
const migrationPath = path.resolve(__dirname, '..', migrationArg || 'sql/postgres/002_hidden_knowledge.sql');

const run = async () => {
    let pgPool;

    try {
        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }

        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        pgPool = new Pool(targetConfig);
        await pgPool.query('SELECT 1 AS ok;');
        await pgPool.query(migrationSql);

        console.table({
            status: 'success',
            action: 'apply-postgres-migration',
            database: targetConfig.database || 'DATABASE_URL',
            migrationFile: migrationPath,
        });
    } catch (error) {
        console.error('[apply-postgres-migration] failed:', error.message);
        process.exitCode = 1;
    } finally {
        if (pgPool) await pgPool.end();
    }
};

if (require.main === module) {
    run();
}

module.exports = { run };
