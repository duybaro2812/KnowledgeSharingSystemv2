const PLAGIARISM_THRESHOLD_PERCENT = 50;

const removeDiacritics = (text) =>
    String(text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

const normalizeText = (text) =>
    removeDiacritics(text)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const tokenize = (text) => {
    const normalized = normalizeText(text);
    if (!normalized) {
        return [];
    }

    return normalized.split(' ').filter(Boolean);
};

const jaccardSimilarity = (tokensA, tokensB) => {
    if (!tokensA.length || !tokensB.length) {
        return 0;
    }

    const setA = new Set(tokensA);
    const setB = new Set(tokensB);
    const intersectionSize = [...setA].filter((token) => setB.has(token)).length;
    const unionSize = new Set([...setA, ...setB]).size;
    if (!unionSize) {
        return 0;
    }

    return intersectionSize / unionSize;
};

const getRiskLevel = (maxScore) => {
    if (maxScore >= 85) {
        return 'high';
    }

    if (maxScore >= PLAGIARISM_THRESHOLD_PERCENT) {
        return 'medium';
    }

    if (maxScore > 0) {
        return 'low';
    }

    return 'none';
};

const scoreByDuplicateReason = (duplicateReason) => {
    switch (duplicateReason) {
        case 'trung_title_va_fileHash':
            return 100;
        case 'trung_fileHash':
            return 97;
        case 'trung_title':
            return 65;
        default:
            return 0;
    }
};

const buildCandidateScore = ({ currentDocument, candidate }) => {
    const currentTokens = tokenize(currentDocument.title);
    const candidateTokens = tokenize(candidate.title);
    const titleSimilarity = jaccardSimilarity(currentTokens, candidateTokens);
    const titleScore = Math.round(titleSimilarity * 70);

    const sameHash =
        currentDocument.fileHash &&
        candidate.fileHash &&
        String(currentDocument.fileHash).toLowerCase() === String(candidate.fileHash).toLowerCase();
    const hashScore = sameHash ? 97 : 0;

    const sameFileName =
        currentDocument.originalFileName &&
        candidate.originalFileName &&
        normalizeText(currentDocument.originalFileName) === normalizeText(candidate.originalFileName);
    const fileNameBoost = sameFileName ? 8 : 0;

    const reasonScore = scoreByDuplicateReason(candidate.duplicateReason);

    const finalScore = Math.max(reasonScore, Math.min(100, Math.max(hashScore, titleScore + fileNameBoost)));

    return {
        ...candidate,
        sameHash,
        sameFileName,
        titleSimilarity: Number(titleSimilarity.toFixed(4)),
        plagiarismPercent: finalScore,
    };
};

const buildPlagiarismAssessment = ({
    documentId,
    currentDocument,
    candidates,
}) => {
    const scored = (candidates || [])
        .map((candidate) => buildCandidateScore({ currentDocument, candidate }))
        .filter((candidate) => candidate.plagiarismPercent > 0)
        .sort((a, b) => b.plagiarismPercent - a.plagiarismPercent);

    const maxPlagiarismPercent = scored[0]?.plagiarismPercent || 0;
    const riskLevel = getRiskLevel(maxPlagiarismPercent);
    const aboveThreshold = maxPlagiarismPercent >= PLAGIARISM_THRESHOLD_PERCENT;

    return {
        documentId,
        checkedAt: new Date().toISOString(),
        thresholdPercent: PLAGIARISM_THRESHOLD_PERCENT,
        maxPlagiarismPercent,
        aboveThreshold,
        riskLevel,
        candidateCount: scored.length,
        topCandidates: scored.slice(0, 5),
        allCandidates: scored,
    };
};

module.exports = {
    PLAGIARISM_THRESHOLD_PERCENT,
    buildPlagiarismAssessment,
};
