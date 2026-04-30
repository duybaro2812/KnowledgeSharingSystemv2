const POINT_POLICY = {
    unlock: {
        previewThreshold: 30,
        fullViewThreshold: 40,
        fullViewDailyLimitFor30To39: 3,
        previewPageLimitWhenLocked: 5,
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
        upvoteReceived: 1,
        documentSavedByOther: 1,
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
    note: 'Upload submissions award 10 points immediately. Moderator/admin review can add approved-upload points later; rejected uploads revert the initial 10 points.',
});

module.exports = {
    POINT_POLICY,
    getSuggestedPointsByStars,
    buildPointPolicyResponse,
};
