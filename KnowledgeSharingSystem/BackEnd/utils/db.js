const dbClient = (process.env.DB_CLIENT || 'postgres').trim().toLowerCase();
const databaseUrl = (process.env.DATABASE_URL || '').trim();

let sql;
let dbConfig;
let pgPool;

const createSqlTypeShim = () => ({
    Int: 'Int',
    BigInt: 'BigInt',
    Bit: 'Bit',
    DateTime2: 'DateTime2',
    Float: 'Float',
    NVarChar: () => 'NVarChar',
    VarChar: () => 'VarChar',
    Decimal: () => 'Decimal',
});

const isPostgresClient = () => true;

if (dbClient !== 'postgres') {
    console.warn(
        `[db] Unsupported DB_CLIENT="${dbClient}". Backend now runs in PostgreSQL-only mode. Falling back to postgres.`
    );
}
sql = createSqlTypeShim();
dbConfig = databaseUrl
    ? {
          connectionString: databaseUrl,
          ssl:
              process.env.DB_ENCRYPT === 'true'
                  ? { rejectUnauthorized: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'true' }
                  : false,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 30000,
      }
    : {
          host: process.env.DB_SERVER || 'localhost',
          port: Number(process.env.DB_PORT || 5432),
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          ssl:
              process.env.DB_ENCRYPT === 'true'
                  ? { rejectUnauthorized: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'true' }
                  : false,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 30000,
      };

const connectDB = async () => {
    if (pgPool) return pgPool;
    const { Pool } = require('pg');
    pgPool = new Pool(dbConfig);
    await pgPool.query('SELECT 1 AS ok;');
    return pgPool;
};

const getPool = () => {
    if (!pgPool) {
        throw new Error('Database pool has not been initialized. Call connectDB() first.');
    }
    return pgPool;
};

const isConnected = () => Boolean(pgPool);

const pingDB = async () => {
    const activePool = await connectDB();
    const result = await activePool.query('SELECT 1 AS ok;');
    return Number(result?.rows?.[0]?.ok || 0) === 1;
};

module.exports = {
    sql,
    dbConfig,
    connectDB,
    getPool,
    isConnected,
    pingDB,
    isPostgresClient,
};
