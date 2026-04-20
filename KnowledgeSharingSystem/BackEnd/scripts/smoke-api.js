require('dotenv').config();

const API_BASE_URL = process.env.SMOKE_API_BASE_URL || 'http://localhost:3000/api';
const SMOKE_USERNAME = process.env.SMOKE_USERNAME || '';
const SMOKE_PASSWORD = process.env.SMOKE_PASSWORD || '';

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

const toJsonSafe = async (response) => {
    try {
        return await response.json();
    } catch {
        return null;
    }
};

const run = async () => {
    const checks = [];

    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    const healthJson = await toJsonSafe(healthResponse);
    assert(healthResponse.ok, 'Health endpoint is not reachable.');
    checks.push({ check: 'GET /health', status: 'ok' });

    const categoriesResponse = await fetch(`${API_BASE_URL}/categories`);
    assert(categoriesResponse.ok, 'Categories endpoint failed.');
    checks.push({ check: 'GET /categories', status: 'ok' });

    const docsResponse = await fetch(`${API_BASE_URL}/documents`);
    assert(docsResponse.ok, 'Documents endpoint failed.');
    checks.push({ check: 'GET /documents', status: 'ok' });

    const pendingNoAuthResponse = await fetch(`${API_BASE_URL}/points/events/pending`);
    assert(
        [401, 403].includes(pendingNoAuthResponse.status),
        'Protected endpoint should reject request without token.'
    );
    checks.push({ check: 'GET /points/events/pending without token', status: 'ok' });

    if (SMOKE_USERNAME && SMOKE_PASSWORD) {
        const loginPaths = ['/auth/login', '/auth/login/admin'];
        let loginJson = null;
        let loginSucceeded = false;

        for (const loginPath of loginPaths) {
            const loginResponse = await fetch(`${API_BASE_URL}${loginPath}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: SMOKE_USERNAME, password: SMOKE_PASSWORD }),
            });
            loginJson = await toJsonSafe(loginResponse);
            if (loginResponse.ok) {
                loginSucceeded = true;
                checks.push({ check: `POST ${loginPath}`, status: 'ok' });
                break;
            }
        }

        assert(loginSucceeded, 'Login failed in smoke test.');
        const token = loginJson?.data?.token;
        assert(token, 'Login response does not include token.');

        const meResponse = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        assert(meResponse.ok, 'GET /auth/me failed with smoke token.');
        checks.push({ check: 'GET /auth/me', status: 'ok' });
    } else {
        checks.push({
            check: 'Auth smoke checks',
            status: 'skipped (set SMOKE_USERNAME and SMOKE_PASSWORD to enable)',
        });
    }

    console.log('Smoke test passed.');
    console.table(checks);
    if (healthJson?.data?.status) {
        console.log(`Health status: ${healthJson.data.status}`);
    }
};

if (require.main === module) {
    run().catch((error) => {
        console.error('Smoke test failed:', error.message);
        process.exit(1);
    });
}

module.exports = {
    run,
};
