const DEFAULT_POINT_POLICY = {
    unlock: {
        previewThreshold: 30,
        fullViewThreshold: 40,
        hiddenKnowledgeThreshold: 61,
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

const clonePolicy = (policy) => JSON.parse(JSON.stringify(policy));

const POINT_POLICY = clonePolicy(DEFAULT_POINT_POLICY);

const POINT_POLICY_SETTING_DEFINITIONS = [
    {
        key: 'unlock.previewThreshold',
        path: ['unlock', 'previewThreshold'],
        category: 'unlock',
        label: 'Mở khóa xem trước tài liệu',
        description: 'Số điểm tối thiểu để người dùng được xem trước nội dung tài liệu.',
        unit: 'điểm',
        min: 0,
        max: 10000,
    },
    {
        key: 'unlock.fullViewThreshold',
        path: ['unlock', 'fullViewThreshold'],
        category: 'unlock',
        label: 'Mở khóa xem toàn bộ tài liệu',
        description: 'Số điểm tối thiểu để người dùng được xem đầy đủ tài liệu.',
        unit: 'điểm',
        min: 0,
        max: 10000,
    },
    {
        key: 'unlock.hiddenKnowledgeThreshold',
        path: ['unlock', 'hiddenKnowledgeThreshold'],
        category: 'unlock',
        label: 'Mở khóa bài tổng hợp kinh nghiệm',
        description: 'Số điểm tối thiểu để người dùng xem Bài tổng hợp kinh nghiệm của tài liệu.',
        unit: 'điểm',
        min: 0,
        max: 100000,
    },
    {
        key: 'unlock.fullViewDailyLimitFor30To39',
        path: ['unlock', 'fullViewDailyLimitFor30To39'],
        category: 'unlock',
        label: 'Giới hạn lượt xem/ngày trước khi đủ điểm',
        description: 'Số lượt xem toàn bộ tài liệu mỗi ngày khi người dùng chưa đạt ngưỡng mở khóa đầy đủ.',
        unit: 'lượt/ngày',
        min: 0,
        max: 1000,
    },
    {
        key: 'unlock.previewPageLimitWhenLocked',
        path: ['unlock', 'previewPageLimitWhenLocked'],
        category: 'unlock',
        label: 'Số trang xem trước khi bị khóa điểm',
        description: 'Số trang được hiển thị khi người dùng chưa đủ điểm mở khóa tài liệu.',
        unit: 'trang',
        min: 1,
        max: 1000,
    },
    {
        key: 'download.standardCost',
        path: ['download', 'standardCost'],
        category: 'download',
        label: 'Điểm trừ khi tải tài liệu',
        description: 'Số điểm bị trừ khi người dùng tải một tài liệu.',
        unit: 'điểm',
        min: 0,
        max: 10000,
    },
    {
        key: 'download.priorityThreshold',
        path: ['download', 'priorityThreshold'],
        category: 'download',
        label: 'Ngưỡng điểm ưu đãi tải tài liệu',
        description: 'Số điểm tối thiểu để người dùng được áp dụng mức điểm tải ưu đãi.',
        unit: 'điểm',
        min: 0,
        max: 100000,
    },
    {
        key: 'download.priorityCost',
        path: ['download', 'priorityCost'],
        category: 'download',
        label: 'Điểm trừ ưu đãi khi tải tài liệu',
        description: 'Số điểm bị trừ khi người dùng đạt ngưỡng ưu đãi tải tài liệu.',
        unit: 'điểm',
        min: 0,
        max: 10000,
    },
    {
        key: 'rewards.uploadSubmitted',
        path: ['rewards', 'uploadSubmitted'],
        category: 'rewards',
        label: 'Thưởng khi gửi tài liệu chờ duyệt',
        description: 'Số điểm cộng ngay khi người dùng upload tài liệu vào hàng chờ duyệt.',
        unit: 'điểm',
        min: -1000,
        max: 1000,
    },
    {
        key: 'rewards.uploadApproved',
        path: ['rewards', 'uploadApproved'],
        category: 'rewards',
        label: 'Thưởng khi tài liệu được duyệt',
        description: 'Số điểm gợi ý cộng thêm khi moderator/admin duyệt tài liệu.',
        unit: 'điểm',
        min: -1000,
        max: 1000,
    },
    {
        key: 'rewards.commentGiven',
        path: ['rewards', 'commentGiven'],
        category: 'rewards',
        label: 'Thưởng cho người viết bình luận',
        description: 'Số điểm chờ duyệt tạo cho người viết bình luận hoặc phản hồi.',
        unit: 'điểm',
        min: -1000,
        max: 1000,
    },
    {
        key: 'rewards.commentReceived',
        path: ['rewards', 'commentReceived'],
        category: 'rewards',
        label: 'Thưởng cho chủ tài liệu khi nhận bình luận',
        description: 'Số điểm chờ duyệt tạo cho chủ tài liệu khi người khác bình luận.',
        unit: 'điểm',
        min: -1000,
        max: 1000,
    },
    {
        key: 'rewards.upvoteReceived',
        path: ['rewards', 'upvoteReceived'],
        category: 'rewards',
        label: 'Thưởng khi tài liệu được thích',
        description: 'Số điểm cộng cho chủ tài liệu khi người khác nhấn thích.',
        unit: 'điểm',
        min: -1000,
        max: 1000,
    },
    {
        key: 'rewards.documentSavedByOther',
        path: ['rewards', 'documentSavedByOther'],
        category: 'rewards',
        label: 'Thưởng khi tài liệu được lưu',
        description: 'Số điểm cộng cho chủ tài liệu khi người khác lưu tài liệu.',
        unit: 'điểm',
        min: -1000,
        max: 1000,
    },
    {
        key: 'commentAntiSpam.windowSeconds',
        path: ['commentAntiSpam', 'windowSeconds'],
        category: 'commentAntiSpam',
        label: 'Khoảng thời gian chống spam bình luận',
        description: 'Khoảng thời gian tính bằng giây dùng để giới hạn số bình luận liên tiếp.',
        unit: 'giây',
        min: 1,
        max: 3600,
    },
    {
        key: 'commentAntiSpam.maxCommentsInWindow',
        path: ['commentAntiSpam', 'maxCommentsInWindow'],
        category: 'commentAntiSpam',
        label: 'Số bình luận tối đa trong khoảng chống spam',
        description: 'Số bình luận tối đa được phép trong khoảng thời gian chống spam.',
        unit: 'bình luận',
        min: 1,
        max: 1000,
    },
    ...[1, 2, 3, 4, 5].map((stars) => ({
        key: `qaRatingSuggestedPoints.${stars}`,
        path: ['qaRatingSuggestedPoints', String(stars)],
        category: 'qaRatingSuggestedPoints',
        label: `Điểm gợi ý khi Q&A được đánh giá ${stars} sao`,
        description: `Số điểm gợi ý cộng/trừ cho chủ tài liệu khi phiên Q&A nhận đánh giá ${stars} sao.`,
        unit: 'điểm',
        min: -1000,
        max: 1000,
    })),
];

const definitionByKey = new Map(POINT_POLICY_SETTING_DEFINITIONS.map((definition) => [definition.key, definition]));

const getPolicyValue = (policy, path) =>
    path.reduce((value, key) => (value && Object.prototype.hasOwnProperty.call(value, key) ? value[key] : undefined), policy);

const setPolicyValue = (policy, path, nextValue) => {
    let cursor = policy;
    path.slice(0, -1).forEach((key) => {
        if (!cursor[key] || typeof cursor[key] !== 'object') {
            cursor[key] = {};
        }
        cursor = cursor[key];
    });
    cursor[path[path.length - 1]] = nextValue;
};

const getDefaultPointPolicySettings = () =>
    POINT_POLICY_SETTING_DEFINITIONS.map((definition) => ({
        ...definition,
        min: Number(definition.min),
        max: Number(definition.max),
        value: Number(getPolicyValue(DEFAULT_POINT_POLICY, definition.path)),
    }));

const getCurrentPointPolicySettings = () =>
    POINT_POLICY_SETTING_DEFINITIONS.map((definition) => ({
        ...definition,
        min: Number(definition.min),
        max: Number(definition.max),
        value: Number(getPolicyValue(POINT_POLICY, definition.path)),
    }));

const validatePointPolicySetting = (key, value, options = {}) => {
    const definition = definitionByKey.get(key);
    if (!definition) {
        const customKey = String(key || '').trim();
        if (!options.allowCustom || !/^custom\.[a-zA-Z0-9_.-]{1,72}$/.test(customKey)) {
            const error = new Error(`Unknown point policy setting: ${key}`);
            error.statusCode = 400;
            throw error;
        }

        const customDefinition = {
            key: customKey,
            path: null,
            category: String(options.category || 'custom').trim().slice(0, 50) || 'custom',
            label: String(options.label || customKey.replace(/^custom\./, '')).trim().slice(0, 120) || customKey,
            description: String(options.description || '').trim().slice(0, 255),
            content: String(options.content || '').trim().slice(0, 4000),
            unit: String(options.unit || 'điểm').trim().slice(0, 40) || 'điểm',
            min: Number.isInteger(Number(options.min)) ? Number(options.min) : -100000,
            max: Number.isInteger(Number(options.max)) ? Number(options.max) : 100000,
            isCustom: true,
        };

        const numericValue = Number(value);
        if (!Number.isInteger(numericValue)) {
            const error = new Error(`${customDefinition.label} must be an integer.`);
            error.statusCode = 400;
            throw error;
        }
        if (customDefinition.min > customDefinition.max) {
            const error = new Error(`${customDefinition.label} has invalid min/max range.`);
            error.statusCode = 400;
            throw error;
        }
        if (numericValue < customDefinition.min || numericValue > customDefinition.max) {
            const error = new Error(`${customDefinition.label} must be between ${customDefinition.min} and ${customDefinition.max}.`);
            error.statusCode = 400;
            throw error;
        }

        return { definition: customDefinition, value: numericValue };
    }

    const numericValue = Number(value);
    if (!Number.isInteger(numericValue)) {
        const error = new Error(`${definition.label} must be an integer.`);
        error.statusCode = 400;
        throw error;
    }

    const effectiveMin = Number.isInteger(Number(options.min)) ? Number(options.min) : definition.min;
    const effectiveMax = Number.isInteger(Number(options.max)) ? Number(options.max) : definition.max;
    if (effectiveMin > effectiveMax) {
        const error = new Error(`${definition.label} has invalid min/max range.`);
        error.statusCode = 400;
        throw error;
    }

    if (numericValue < effectiveMin || numericValue > effectiveMax) {
        const error = new Error(`${definition.label} must be between ${effectiveMin} and ${effectiveMax}.`);
        error.statusCode = 400;
        throw error;
    }

    return {
        definition: {
            ...definition,
            category: String(options.category || definition.category).trim().slice(0, 50) || definition.category,
            label: String(options.label || definition.label).trim().slice(0, 120) || definition.label,
            description: String(options.description || definition.description).trim().slice(0, 255),
            content: String(options.content || definition.content || '').trim().slice(0, 4000),
            unit: String(options.unit || definition.unit || 'điểm').trim().slice(0, 40) || 'điểm',
            min: effectiveMin,
            max: effectiveMax,
        },
        value: numericValue,
    };
};

const applyPointPolicySettings = (settings = []) => {
    const nextPolicy = clonePolicy(DEFAULT_POINT_POLICY);
    settings.forEach((setting) => {
        const key = setting.key || setting.settingKey;
        const value = setting.value ?? setting.settingValue;
        const { definition, value: numericValue } = validatePointPolicySetting(key, value, {
            allowCustom: true,
            category: setting.category,
            label: setting.label,
            description: setting.description,
            unit: setting.unit,
            min: setting.min,
            max: setting.max,
        });
        if (definition.isCustom || !definition.path) return;
        setPolicyValue(nextPolicy, definition.path, numericValue);
    });

    Object.keys(POINT_POLICY).forEach((key) => {
        delete POINT_POLICY[key];
    });
    Object.assign(POINT_POLICY, nextPolicy);
    return POINT_POLICY;
};

const getSuggestedPointsByStars = (stars) => {
    const normalized = Number(stars);
    if (!Number.isInteger(normalized) || normalized < 1 || normalized > 5) {
        return 0;
    }
    return POINT_POLICY.qaRatingSuggestedPoints[normalized] ?? 0;
};

const buildPointPolicyResponse = (extraSettings = []) => ({
    ...POINT_POLICY,
    settings: [
        ...getCurrentPointPolicySettings(),
        ...extraSettings.map((setting) => ({
            key: setting.key || setting.settingKey,
            category: setting.category || 'custom',
            label: setting.label || setting.key || setting.settingKey,
            description: setting.description || '',
            content: setting.content || '',
            unit: setting.unit || 'điểm',
            value: Number(setting.value ?? setting.settingValue ?? 0),
            min: Number(setting.min ?? -100000),
            max: Number(setting.max ?? 100000),
            isCustom: true,
        })),
    ],
    note: 'Upload submissions award 10 points immediately. Moderator/admin review can add approved-upload points later; rejected uploads revert the initial 10 points.',
});

module.exports = {
    DEFAULT_POINT_POLICY,
    POINT_POLICY,
    POINT_POLICY_SETTING_DEFINITIONS,
    getDefaultPointPolicySettings,
    applyPointPolicySettings,
    validatePointPolicySetting,
    getSuggestedPointsByStars,
    buildPointPolicyResponse,
};
