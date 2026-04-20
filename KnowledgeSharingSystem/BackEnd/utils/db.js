const authMode = process.env.DB_AUTH_MODE || 'sql';

const rawServer = process.env.DB_SERVER || 'localhost';
const [serverHost, instanceName] = rawServer.split('\\');
const hasExplicitPort = Boolean(process.env.DB_PORT);

const createCommonConfig = () => ({
    server: serverHost,
    database: process.env.DB_NAME,
    connectionTimeout: 30000,
    requestTimeout: 30000,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        ...(!hasExplicitPort && instanceName ? { instanceName } : {}),
    },
    ...(hasExplicitPort ? { port: Number(process.env.DB_PORT) } : {}),
});

let sql;
let dbConfig;

if (authMode === 'windows') {
    try {
        sql = require('mssql/msnodesqlv8');
    } catch (error) {
        throw new Error(
            'Windows Authentication requires the "msnodesqlv8" driver. Install it with: npm install msnodesqlv8'
        );
    }

    dbConfig = {
        ...createCommonConfig(),
        driver: 'msnodesqlv8',
        options: {
            ...createCommonConfig().options,
            trustedConnection: true,
        },
        connectionString: `Server=${process.env.DB_SERVER};Database=${process.env.DB_NAME};Trusted_Connection=Yes;Encrypt=${process.env.DB_ENCRYPT === 'true' ? 'Yes' : 'No'};TrustServerCertificate=${process.env.DB_TRUST_SERVER_CERTIFICATE === 'true' ? 'Yes' : 'No'};`,
    };
} else {
    sql = require('mssql');

    dbConfig = {
        ...createCommonConfig(),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    };
}

let pool;

const connectDB = async () => {
    if (pool) {
        return pool;
    }

    pool = await sql.connect(dbConfig);
    return pool;
};

const getPool = () => {
    if (!pool) {
        throw new Error('Database pool has not been initialized. Call connectDB() first.');
    }

    return pool;
};

const isConnected = () => {
    if (!pool) return false;
    return Boolean(pool.connected || pool.connecting);
};

const pingDB = async () => {
    const activePool = pool || (await connectDB());
    const result = await activePool.request().query('SELECT 1 AS ok;');
    return Number(result?.recordset?.[0]?.ok || 0) === 1;
};

module.exports = {
    sql,
    dbConfig,
    connectDB,
    getPool,
    isConnected,
    pingDB,
};
