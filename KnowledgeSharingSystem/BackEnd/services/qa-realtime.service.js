const jwt = require('jsonwebtoken');
const WebSocket = require('ws');
const qaSessionModel = require('../models/qa-session.model');

const userSockets = new Map();
const socketMeta = new WeakMap();
let wsServer = null;
let initialized = false;

const toPositiveInt = (value) => {
    const numeric = Number(value);
    return Number.isInteger(numeric) && numeric > 0 ? numeric : 0;
};

const parseUpgradeUrl = (req) => {
    try {
        return new URL(req.url || '/', 'http://localhost');
    } catch {
        return null;
    }
};

const extractToken = (req) => {
    const parsedUrl = parseUpgradeUrl(req);
    const tokenFromQuery = parsedUrl?.searchParams?.get('token') || '';
    const authHeader = req.headers?.authorization || '';
    const tokenFromHeader = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    return String(tokenFromHeader || tokenFromQuery || '').trim();
};

const rejectUpgrade = (socket, statusCode, message) => {
    if (!socket || socket.destroyed) return;
    socket.write(
        `HTTP/1.1 ${statusCode} ${message}\r\n` +
            'Connection: close\r\n' +
            'Content-Type: text/plain\r\n' +
            '\r\n'
    );
    socket.destroy();
};

const safeSend = (socket, payload) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    try {
        socket.send(JSON.stringify(payload));
        return true;
    } catch {
        return false;
    }
};

const addUserSocket = (userId, socket) => {
    if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket);
};

const removeUserSocket = (userId, socket) => {
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    sockets.delete(socket);
    if (!sockets.size) {
        userSockets.delete(userId);
    }
};

const handleSubscribe = async ({ socket, meta, sessionId }) => {
    const normalizedSessionId = toPositiveInt(sessionId);
    if (!normalizedSessionId) {
        safeSend(socket, {
            event: 'qa.error',
            data: { message: 'sessionId must be a positive integer.' },
        });
        return;
    }

    const session = await qaSessionModel.getSessionByIdForUser({
        sessionId: normalizedSessionId,
        userId: meta.userId,
    });

    if (!session) {
        safeSend(socket, {
            event: 'qa.error',
            data: { message: 'Session not found or access denied.', sessionId: normalizedSessionId },
        });
        return;
    }

    meta.subscribedSessionIds.add(normalizedSessionId);
    safeSend(socket, {
        event: 'qa.subscribed',
        data: {
            sessionId: normalizedSessionId,
            status: session.status,
            subscribedAt: new Date().toISOString(),
        },
    });
};

const handleUnsubscribe = ({ socket, meta, sessionId }) => {
    const normalizedSessionId = toPositiveInt(sessionId);
    if (!normalizedSessionId) return;

    meta.subscribedSessionIds.delete(normalizedSessionId);
    safeSend(socket, {
        event: 'qa.unsubscribed',
        data: {
            sessionId: normalizedSessionId,
            unsubscribedAt: new Date().toISOString(),
        },
    });
};

const handleSocketMessage = async (socket, raw) => {
    const meta = socketMeta.get(socket);
    if (!meta) return;

    let payload;
    try {
        payload = JSON.parse(String(raw || ''));
    } catch {
        safeSend(socket, {
            event: 'qa.error',
            data: { message: 'Invalid JSON payload.' },
        });
        return;
    }

    const type = String(payload?.type || '').trim().toLowerCase();
    if (type === 'qa.subscribe') {
        await handleSubscribe({ socket, meta, sessionId: payload?.sessionId });
        return;
    }

    if (type === 'qa.unsubscribe') {
        handleUnsubscribe({ socket, meta, sessionId: payload?.sessionId });
        return;
    }

    if (type === 'ping') {
        safeSend(socket, {
            event: 'pong',
            data: { at: new Date().toISOString() },
        });
        return;
    }

    safeSend(socket, {
        event: 'qa.error',
        data: { message: 'Unsupported message type.' },
    });
};

const broadcastToSession = ({ sessionId, participantUserIds = [], event, data = {} }) => {
    const normalizedSessionId = toPositiveInt(sessionId);
    if (!normalizedSessionId) return 0;

    const normalizedUserIds = [...new Set((participantUserIds || []).map(toPositiveInt))]
        .filter((id) => id > 0);
    if (!normalizedUserIds.length) return 0;

    let deliveredCount = 0;

    normalizedUserIds.forEach((userId) => {
        const sockets = userSockets.get(userId);
        if (!sockets || !sockets.size) return;

        sockets.forEach((socket) => {
            const meta = socketMeta.get(socket);
            if (!meta || !meta.subscribedSessionIds.has(normalizedSessionId)) return;

            const ok = safeSend(socket, {
                event: event || 'qa.event',
                data: {
                    sessionId: normalizedSessionId,
                    ...data,
                },
            });
            if (ok) deliveredCount += 1;
        });
    });

    return deliveredCount;
};

const initQaRealtimeServer = ({ server }) => {
    if (initialized) return wsServer;
    if (!server) {
        throw new Error('HTTP server is required to initialize QA realtime server.');
    }

    wsServer = new WebSocket.Server({ noServer: true });

    server.on('upgrade', (req, socket, head) => {
        const parsedUrl = parseUpgradeUrl(req);
        if (parsedUrl?.pathname !== '/ws/qa') {
            socket.destroy();
            return;
        }

        const token = extractToken(req);
        if (!token) {
            rejectUpgrade(socket, 401, 'Unauthorized');
            return;
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            rejectUpgrade(socket, 401, 'Unauthorized');
            return;
        }

        const userId = toPositiveInt(decoded?.userId);
        if (!userId) {
            rejectUpgrade(socket, 401, 'Unauthorized');
            return;
        }

        wsServer.handleUpgrade(req, socket, head, (wsSocket) => {
            wsServer.emit('connection', wsSocket, {
                userId,
                requestId: req.headers?.['x-request-id'] || null,
            });
        });
    });

    wsServer.on('connection', (socket, context = {}) => {
        const userId = toPositiveInt(context.userId);
        if (!userId) {
            socket.close(1008, 'Unauthorized');
            return;
        }

        const meta = {
            userId,
            subscribedSessionIds: new Set(),
        };
        socketMeta.set(socket, meta);
        addUserSocket(userId, socket);

        safeSend(socket, {
            event: 'qa.connected',
            data: {
                userId,
                connectedAt: new Date().toISOString(),
            },
        });

        socket.on('message', async (raw) => {
            try {
                await handleSocketMessage(socket, raw);
            } catch {
                safeSend(socket, {
                    event: 'qa.error',
                    data: { message: 'Failed to handle websocket message.' },
                });
            }
        });

        socket.on('close', () => {
            removeUserSocket(userId, socket);
            socketMeta.delete(socket);
        });

        socket.on('error', () => {
            removeUserSocket(userId, socket);
            socketMeta.delete(socket);
        });
    });

    initialized = true;
    return wsServer;
};

module.exports = {
    initQaRealtimeServer,
    broadcastToSession,
};
