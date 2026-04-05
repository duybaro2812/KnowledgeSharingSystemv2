const VALIDATION_RULES = Object.freeze({
    auth: {
        usernameMin: 3,
        usernameMax: 50,
        nameMax: 100,
        emailMax: 255,
        passwordMin: 6,
        passwordMax: 255,
        otpLength: 6,
    },
    category: {
        nameMax: 120,
        descriptionMax: 500,
    },
    document: {
        titleMax: 255,
        descriptionMax: 4000,
        reportReasonMax: 500,
        moderationNoteMax: 255,
        penaltyNoteMax: 255,
        lockReasonMax: 255,
    },
    comment: {
        contentMax: 2000,
        moderationNoteMax: 255,
    },
    qa: {
        initialMessageMax: 2000,
        messageMax: 2000,
        feedbackMax: 500,
    },
    user: {
        nameMax: 100,
    },
});

module.exports = {
    VALIDATION_RULES,
};
