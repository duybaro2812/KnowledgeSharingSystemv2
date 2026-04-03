const channelsByUserId = new Map();

const ensureChannel = (userId) => {
    if (!channelsByUserId.has(userId)) {
        channelsByUserId.set(userId, new Set());
    }
    return channelsByUserId.get(userId);
};

const subscribe = ({ userId, res }) => {
    const channel = ensureChannel(userId);
    channel.add(res);
};

const unsubscribe = ({ userId, res }) => {
    const channel = channelsByUserId.get(userId);
    if (!channel) return;

    channel.delete(res);
    if (!channel.size) {
        channelsByUserId.delete(userId);
    }
};

const pushToUser = ({ userId, payload }) => {
    const channel = channelsByUserId.get(userId);
    if (!channel || !channel.size) return 0;

    const serialized = `data: ${JSON.stringify(payload)}\n\n`;
    let delivered = 0;

    channel.forEach((res) => {
        if (res.writableEnded || res.destroyed) return;
        res.write(serialized);
        delivered += 1;
    });

    return delivered;
};

module.exports = {
    subscribe,
    unsubscribe,
    pushToUser,
};
