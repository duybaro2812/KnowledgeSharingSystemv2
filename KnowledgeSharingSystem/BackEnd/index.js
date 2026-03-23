require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./utils/db');
const { seedDefaultAdmin } = require('./services/admin-seed.service');

const PORT = Number(process.env.PORT) || 3000;

const startServer = async () => {
    try {
        await connectDB();
        await seedDefaultAdmin();

        app.listen(PORT, () => {
            console.log(`Server is running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();
