require('dotenv').config();

const app = require('../app');

const hasApiRouterMounted = () => {
    const stack = app?._router?.stack || app?.router?.stack || [];
    return stack.some((layer) => {
        if (layer?.name === 'router') {
            return true;
        }
        const routePath = layer?.route?.path;
        const mountPath =
            typeof layer?.path === 'string'
                ? layer.path
                : layer?.regexp?.toString?.() || '';
        return routePath === '/api' || mountPath.includes('/api') || mountPath.includes('\\/api');
    });
};

const run = () => {
    if (!app) {
        throw new Error('Express app could not be loaded.');
    }

    if (!hasApiRouterMounted()) {
        throw new Error('API routes are not mounted on app.');
    }

    console.log('Backend structure check passed.');
};

if (require.main === module) {
    try {
        run();
        process.exit(0);
    } catch (error) {
        console.error('Backend structure check failed:', error.message);
        process.exit(1);
    }
}

module.exports = { run };
