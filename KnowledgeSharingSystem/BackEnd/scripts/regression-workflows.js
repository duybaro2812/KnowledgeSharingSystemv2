require('dotenv').config();

const API_BASE_URL = process.env.SMOKE_API_BASE_URL || 'http://localhost:3000/api';

const creds = {
    user: {
        username: process.env.SMOKE_USERNAME || '',
        password: process.env.SMOKE_PASSWORD || '',
    },
    moderator: {
        username: process.env.SMOKE_MODERATOR_USERNAME || '',
        password: process.env.SMOKE_MODERATOR_PASSWORD || '',
    },
    admin: {
        username: process.env.SMOKE_ADMIN_USERNAME || '',
        password: process.env.SMOKE_ADMIN_PASSWORD || '',
    },
};

const results = [];

const record = (name, ok, detail = '') => {
    results.push({
        check: name,
        status: ok ? 'PASS' : 'FAIL',
        detail,
    });
    if (!ok) {
        throw new Error(`${name} failed${detail ? `: ${detail}` : ''}`);
    }
};

const toJsonSafe = async (response) => {
    try {
        return await response.json();
    } catch {
        return null;
    }
};

const requestJson = async (path, { method = 'GET', token = '', body } = {}) => {
    const url = `${API_BASE_URL}${path}`;
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await toJsonSafe(response);
    return { response, payload };
};

const login = async ({ username, password }, { adminPreferred = false } = {}) => {
    if (!username || !password) return null;
    const paths = adminPreferred ? ['/auth/login/admin', '/auth/login'] : ['/auth/login', '/auth/login/admin'];

    for (const path of paths) {
        const { response, payload } = await requestJson(path, {
            method: 'POST',
            body: { username, password },
        });
        if (response.ok && payload?.data?.token) {
            return {
                token: payload.data.token,
                user: payload.data.user,
                loginPath: path,
            };
        }
    }
    return null;
};

const expectProtectedDeniedWithoutToken = async (path) => {
    const { response } = await requestJson(path);
    return [401, 403].includes(response.status);
};

const checkBaseEndpoints = async () => {
    const { response: healthRes, payload: healthPayload } = await requestJson('/health');
    record('GET /health reachable', [200, 503].includes(healthRes.status), `status=${healthRes.status}`);
    record(
        'GET /health returns runtime payload',
        Boolean(healthPayload?.data?.runtime),
        'missing runtime metrics'
    );

    const { response: categoriesRes } = await requestJson('/categories');
    record('GET /categories public access', categoriesRes.ok, `status=${categoriesRes.status}`);

    const { response: docsRes } = await requestJson('/documents');
    record('GET /documents public access', docsRes.ok, `status=${docsRes.status}`);

    const deniedModeration = await expectProtectedDeniedWithoutToken('/moderation/stats');
    record('GET /moderation/stats denied without token', deniedModeration);
};

const checkUserRole = async () => {
    const session = await login(creds.user);
    if (!session) {
        results.push({
            check: 'User role checks',
            status: 'SKIP',
            detail: 'Set SMOKE_USERNAME and SMOKE_PASSWORD',
        });
        return;
    }

    record('User login', true, session.loginPath);

    const { response: meRes } = await requestJson('/auth/me', { token: session.token });
    record('User GET /auth/me', meRes.ok, `status=${meRes.status}`);

    const { response: myUploadsRes } = await requestJson('/documents/my-uploaded', { token: session.token });
    record('User GET /documents/my-uploaded', myUploadsRes.ok, `status=${myUploadsRes.status}`);

    const { response: notifRes } = await requestJson('/notifications/my', { token: session.token });
    record('User GET /notifications/my', notifRes.ok, `status=${notifRes.status}`);

    const { response: moderationRes } = await requestJson('/moderation/stats', { token: session.token });
    record('User blocked from moderation stats', moderationRes.status === 403, `status=${moderationRes.status}`);

    const { response: usersRes } = await requestJson('/users', { token: session.token });
    record('User blocked from admin users list', usersRes.status === 403, `status=${usersRes.status}`);
};

const checkModeratorRole = async () => {
    const session = await login(creds.moderator);
    if (!session) {
        results.push({
            check: 'Moderator role checks',
            status: 'SKIP',
            detail: 'Set SMOKE_MODERATOR_USERNAME and SMOKE_MODERATOR_PASSWORD',
        });
        return;
    }

    record('Moderator login', true, session.loginPath);

    const { response: moderationRes } = await requestJson('/moderation/stats', { token: session.token });
    record('Moderator GET /moderation/stats', moderationRes.ok, `status=${moderationRes.status}`);

    const { response: moderationTimelineRes } = await requestJson('/moderation/timeline', { token: session.token });
    record('Moderator GET /moderation/timeline', moderationTimelineRes.ok, `status=${moderationTimelineRes.status}`);

    const { response: usersRes } = await requestJson('/users', { token: session.token });
    record('Moderator blocked from admin users list', usersRes.status === 403, `status=${usersRes.status}`);
};

const checkAdminRole = async () => {
    const session = await login(creds.admin, { adminPreferred: true });
    if (!session) {
        results.push({
            check: 'Admin role checks',
            status: 'SKIP',
            detail: 'Set SMOKE_ADMIN_USERNAME and SMOKE_ADMIN_PASSWORD',
        });
        return;
    }

    record('Admin login', true, session.loginPath);

    const { response: usersRes } = await requestJson('/users', { token: session.token });
    record('Admin GET /users', usersRes.ok, `status=${usersRes.status}`);

    const { response: auditRes } = await requestJson('/users/audit-logs', { token: session.token });
    record('Admin GET /users/audit-logs', auditRes.ok, `status=${auditRes.status}`);

    const { response: moderationStatsRes } = await requestJson('/moderation/stats', { token: session.token });
    record('Admin GET /moderation/stats', moderationStatsRes.ok, `status=${moderationStatsRes.status}`);
};

const run = async () => {
    await checkBaseEndpoints();
    await checkUserRole();
    await checkModeratorRole();
    await checkAdminRole();

    console.log('Regression workflow checks completed.');
    console.table(results);
};

if (require.main === module) {
    run().catch((error) => {
        console.table(results);
        console.error('Regression workflow checks failed:', error.message);
        process.exit(1);
    });
}

module.exports = { run };
