require('dotenv').config();

const http = require('http');
const app = require('./app');
const { connectDB } = require('./utils/db');
const { seedDefaultAdmin } = require('./services/admin-seed.service');
const { initQaRealtimeServer } = require('./services/qa-realtime.service');
const { validateEnv } = require('./config/env');

const PORT = Number(process.env.PORT) || 3000;

const startServer = async () => {
    try {
        validateEnv();
        await connectDB();

        await seedDefaultAdmin();

        const server = http.createServer(app);
        initQaRealtimeServer({ server });

        server.listen(PORT, () => {
            console.log(`Server is running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();
