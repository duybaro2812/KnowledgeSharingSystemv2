require('dotenv').config();

const { run: runSeedTestData } = require('./seed-test-data');
const { connectDB, getPool } = require('../utils/db');

const seedDemoData = async () => {
    await runSeedTestData();

    const pool = getPool();
    const result = await pool.request().query(`
        SELECT
            (SELECT COUNT(1) FROM dbo.Users) AS totalUsers,
            (SELECT COUNT(1) FROM dbo.Categories WHERE status = N'active') AS activeCategories,
            (SELECT COUNT(1) FROM dbo.Documents) AS totalDocuments,
            (SELECT COUNT(1) FROM dbo.Notifications) AS totalNotifications;
    `);

    const summary = result.recordset[0] || {};
    console.log('Demo seed summary:');
    console.table([summary]);
};

if (require.main === module) {
    connectDB()
        .then(() => seedDemoData())
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Failed to seed demo data:', error.message);
            process.exit(1);
        });
}

module.exports = {
    seedDemoData,
};

