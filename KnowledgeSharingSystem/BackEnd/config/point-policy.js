const POINT_POLICY = {
    unlock: {
        previewThreshold: 30,
        fullViewThreshold: 40,
        fullViewDailyLimitFor30To39: 3,
    },
    download: {
        standardCost: 30,
        priorityThreshold: 200,
        priorityCost: 15,
    },
    rewards: {
        uploadSubmitted: 10,
        uploadApproved: 30,
        commentGiven: 2,
        commentReceived: 3,
    },
    commentAntiSpam: {
        windowSeconds: 30,
        maxCommentsInWindow: 4,
    },
    qaRatingSuggestedPoints: {
        1: -20,
        2: -10,
        3: 0,
        4: 10,
        5: 20,
    },
};

const getSuggestedPointsByStars = (stars) => {
    const normalized = Number(stars);
    if (!Number.isInteger(normalized) || normalized < 1 || normalized > 5) {
        return 0;
    }
    return POINT_POLICY.qaRatingSuggestedPoints[normalized] ?? 0;
};

const buildPointPolicyResponse = () => ({
    ...POINT_POLICY,
    note: 'Point events are applied after moderator/admin review based on platform policy.',
});

module.exports = {
    POINT_POLICY,
    getSuggestedPointsByStars,
    buildPointPolicyResponse,
};
