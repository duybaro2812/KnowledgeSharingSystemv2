const PROCESS_START_AT = Date.now();

const state = {
    requestsTotal: 0,
    responsesByStatusClass: {
        '2xx': 0,
        '3xx': 0,
        '4xx': 0,
        '5xx': 0,
        other: 0,
    },
    authFailures: 0,
    rateLimitHits: 0,
    totalResponseTimeMs: 0,
    maxResponseTimeMs: 0,
};

const clampNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const getStatusClass = (statusCode) => {
    const code = clampNumber(statusCode);
    if (code >= 200 && code < 300) return '2xx';
    if (code >= 300 && code < 400) return '3xx';
    if (code >= 400 && code < 500) return '4xx';
    if (code >= 500 && code < 600) return '5xx';
    return 'other';
};

const recordRequest = ({ statusCode, durationMs }) => {
    state.requestsTotal += 1;

    const statusClass = getStatusClass(statusCode);
    state.responsesByStatusClass[statusClass] += 1;

    const safeDuration = Math.max(0, clampNumber(durationMs));
    state.totalResponseTimeMs += safeDuration;
    state.maxResponseTimeMs = Math.max(state.maxResponseTimeMs, safeDuration);

    if (clampNumber(statusCode) === 429) {
        state.rateLimitHits += 1;
    }
};

const recordAuthFailure = () => {
    state.authFailures += 1;
};

const getSnapshot = () => {
    const uptimeMs = Math.max(0, Date.now() - PROCESS_START_AT);
    const requestsTotal = clampNumber(state.requestsTotal);

    return {
        uptimeMs,
        uptimeSeconds: Math.floor(uptimeMs / 1000),
        processStartedAt: new Date(PROCESS_START_AT).toISOString(),
        requests: {
            total: requestsTotal,
            byStatusClass: { ...state.responsesByStatusClass },
            avgResponseTimeMs:
                requestsTotal > 0
                    ? Number((state.totalResponseTimeMs / requestsTotal).toFixed(2))
                    : 0,
            maxResponseTimeMs: clampNumber(state.maxResponseTimeMs),
        },
        authFailures: clampNumber(state.authFailures),
        rateLimitHits: clampNumber(state.rateLimitHits),
    };
};

module.exports = {
    recordRequest,
    recordAuthFailure,
    getSnapshot,
};

