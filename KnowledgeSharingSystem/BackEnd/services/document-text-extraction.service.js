const path = require('path');

const MAX_EXTRACTED_TEXT_LENGTH = 250000;

const normalizeText = (text) =>
    String(text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const clampText = (text) => String(text || '').slice(0, MAX_EXTRACTED_TEXT_LENGTH);

const getExtension = (originalFileName = '') =>
    path.extname(String(originalFileName)).replace('.', '').toLowerCase();

const extractPdfText = async (buffer) => {
    try {
        // Lazy-load to avoid crashing environments where dependency is not installed yet.
        // eslint-disable-next-line global-require, import/no-extraneous-dependencies
        const pdfParse = require('pdf-parse');
        const parsed = await pdfParse(buffer);
        return {
            text: clampText(parsed?.text || ''),
            method: 'pdf-parse',
            warning: null,
        };
    } catch (error) {
        return {
            text: '',
            method: 'pdf-parse',
            warning:
                'PDF extraction dependency missing or failed. Install package "pdf-parse" to improve plagiarism checks.',
        };
    }
};

const extractDocxText = async (buffer) => {
    try {
        // Lazy-load to avoid crashing environments where dependency is not installed yet.
        // eslint-disable-next-line global-require, import/no-extraneous-dependencies
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        return {
            text: clampText(result?.value || ''),
            method: 'mammoth',
            warning: null,
        };
    } catch (error) {
        return {
            text: '',
            method: 'mammoth',
            warning:
                'DOCX extraction dependency missing or failed. Install package "mammoth" to improve plagiarism checks.',
        };
    }
};

const extractTextFromDocument = async ({
    buffer,
    originalFileName,
    mimeType,
    title = '',
    description = '',
}) => {
    const ext = getExtension(originalFileName);
    const lowerMime = String(mimeType || '').toLowerCase();

    let extracted = { text: '', method: 'fallback', warning: null };

    if (ext === 'pdf' || lowerMime === 'application/pdf') {
        extracted = await extractPdfText(buffer);
    } else if (
        ext === 'docx' ||
        lowerMime ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
        extracted = await extractDocxText(buffer);
    }

    const fallbackText = [title, description, originalFileName].filter(Boolean).join(' ');
    const mergedText = clampText([extracted.text, fallbackText].filter(Boolean).join(' '));
    const normalizedText = normalizeText(mergedText);

    return {
        extractedText: mergedText,
        normalizedText,
        tokenCount: normalizedText ? normalizedText.split(' ').filter(Boolean).length : 0,
        extractionMethod: extracted.method,
        extractionWarning: extracted.warning,
    };
};

module.exports = {
    extractTextFromDocument,
};
