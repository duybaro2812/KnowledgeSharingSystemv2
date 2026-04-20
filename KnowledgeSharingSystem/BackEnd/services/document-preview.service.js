const crypto = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { downloadStoredDocumentBuffer } = require('./cloudinary.service');

const execFileAsync = promisify(execFile);

const PDF_EXTENSIONS = new Set(['.pdf']);
const TEXT_EXTENSIONS = new Set(['.txt']);
const OFFICE_EXTENSIONS = new Set(['.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx']);
const MANIFEST_FILE_NAME = 'manifest.json';
const PREVIEW_PDF_NAME = 'viewer.pdf';
const PREVIEW_HTML_NAME = 'viewer.html';
const PREVIEW_VERSION = 1;
const PREVIEW_FETCH_RETRY_ATTEMPTS = Number(process.env.DOCUMENT_PREVIEW_FETCH_RETRY_ATTEMPTS || 3);
const PREVIEW_FETCH_RETRY_DELAY_MS = Number(process.env.DOCUMENT_PREVIEW_FETCH_RETRY_DELAY_MS || 350);
const PREVIEW_CONVERT_RETRY_ATTEMPTS = Number(process.env.DOCUMENT_PREVIEW_CONVERT_RETRY_ATTEMPTS || 2);
const PREVIEW_CONVERT_RETRY_DELAY_MS = Number(process.env.DOCUMENT_PREVIEW_CONVERT_RETRY_DELAY_MS || 500);

let discoveredLibreOfficePath = undefined;
const previewPreparationInFlight = new Map();

const getBackendRoot = () => path.resolve(__dirname, '..');
const getUploadsRoot = () =>
    path.resolve(getBackendRoot(), process.env.UPLOAD_DIR || 'uploads');
const getPreviewRoot = () => path.join(getUploadsRoot(), 'previews');
const getPreviewWorkRoot = () => {
    const configuredRoot = process.env.DOCUMENT_PREVIEW_WORK_DIR;

    if (configuredRoot && String(configuredRoot).trim()) {
        return path.resolve(String(configuredRoot).trim());
    }

    // Use system temp by default to avoid LibreOffice issues with non-ASCII project paths.
    return path.join(os.tmpdir(), 'neushare-preview-work');
};
const getDocumentPreviewDir = (documentId) =>
    path.join(getPreviewRoot(), `document-${Number(documentId)}`);
const getManifestPath = (documentId) =>
    path.join(getDocumentPreviewDir(documentId), MANIFEST_FILE_NAME);

const toUploadPublicUrl = (absolutePath) => {
    const uploadsRoot = getUploadsRoot();
    const relativePath = path.relative(uploadsRoot, absolutePath).replace(/\\/g, '/');

    return `/uploads/${relativePath}`;
};

const hashBuffer = (buffer) =>
    crypto.createHash('sha256').update(buffer).digest('hex');

const wait = (durationMs) =>
    new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(durationMs) || 0)));

const withRetry = async (task, { attempts, delayMs, shouldRetry }) => {
    const totalAttempts = Math.max(1, Number(attempts) || 1);
    let latestError = null;

    for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
        try {
            return await task(attempt);
        } catch (error) {
            latestError = error;
            const allowRetry =
                attempt < totalAttempts &&
                (typeof shouldRetry !== 'function' || shouldRetry(error));

            if (!allowRetry) {
                throw error;
            }

            await wait(delayMs);
        }
    }

    throw latestError || new Error('Preview retry pipeline failed.');
};

const inferExtension = ({ originalFileName, mimeType }) => {
    const explicitExtension = path.extname(String(originalFileName || '')).toLowerCase();

    if (explicitExtension) {
        return explicitExtension;
    }

    const normalizedMime = String(mimeType || '').toLowerCase();

    if (normalizedMime.includes('pdf')) return '.pdf';
    if (normalizedMime.includes('plain')) return '.txt';
    if (normalizedMime.includes('word')) return '.docx';
    if (normalizedMime.includes('presentation')) return '.pptx';
    if (normalizedMime.includes('sheet') || normalizedMime.includes('excel')) return '.xlsx';

    return '';
};

const buildUnavailableManifest = ({
    documentId,
    sourceHash,
    originalFileName,
    mimeType,
    reason,
    converter = null,
}) => ({
    version: PREVIEW_VERSION,
    documentId: Number(documentId),
    status: 'unavailable',
    sourceHash,
    originalFileName,
    mimeType,
    converter,
    reason,
    generatedAt: new Date().toISOString(),
    viewer: null,
});

const readManifest = async (documentId) => {
    try {
        const raw = await fs.readFile(getManifestPath(documentId), 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }

        throw error;
    }
};

const writeManifest = async (documentId, manifest) => {
    const previewDir = getDocumentPreviewDir(documentId);
    await fs.mkdir(previewDir, { recursive: true });
    await fs.writeFile(
        getManifestPath(documentId),
        JSON.stringify(manifest, null, 2),
        'utf8'
    );
    return manifest;
};

const safeRemoveDirectory = async (targetPath) => {
    if (!targetPath) return;

    const attempts = 5;

    for (let index = 0; index < attempts; index += 1) {
        try {
            await fs.rm(targetPath, { recursive: true, force: true });
            return;
        } catch (error) {
            const isBusy = ['EBUSY', 'EPERM', 'ENOTEMPTY'].includes(error.code);
            if (!isBusy || index === attempts - 1) {
                throw error;
            }

            await new Promise((resolve) => setTimeout(resolve, 250 * (index + 1)));
        }
    }
};

const ensurePreviewDirectory = async (documentId) => {
    const previewDir = getDocumentPreviewDir(documentId);
    await fs.mkdir(previewDir, { recursive: true });
    return previewDir;
};

const createPreviewWorkDirectory = async (documentId) => {
    const workRoot = getPreviewWorkRoot();
    await fs.mkdir(workRoot, { recursive: true });

    return fs.mkdtemp(path.join(workRoot, `document-${Number(documentId)}-`));
};

const cleanupPreviewArtifacts = async (previewDir) => {
    const artifactNames = [PREVIEW_PDF_NAME, PREVIEW_HTML_NAME, MANIFEST_FILE_NAME];

    await Promise.all(
        artifactNames.map(async (artifactName) => {
            try {
                await fs.unlink(path.join(previewDir, artifactName));
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }
        })
    );

    const staleSources = await fs.readdir(previewDir).catch((error) => {
        if (error.code === 'ENOENT') {
            return [];
        }

        throw error;
    });

    await Promise.all(
        staleSources
            .filter((name) => /^source\./i.test(name))
            .map((name) => safeRemoveDirectory(path.join(previewDir, name)).catch(async () => {
                try {
                    await fs.unlink(path.join(previewDir, name));
                } catch (error) {
                    if (error.code !== 'ENOENT') {
                        throw error;
                    }
                }
            }))
    );

    return previewDir;
};

const escapeHtml = (value) =>
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const buildTextPreviewHtml = ({ title, originalFileName, textContent }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title || originalFileName || 'Document preview')}</title>
  <style>
    :root {
      color-scheme: light;
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      background: #eef4fb;
      color: #17324d;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      padding: 40px 24px;
      background:
        radial-gradient(circle at top right, rgba(20, 145, 191, 0.14), transparent 32%),
        linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%);
    }
    .sheet {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid rgba(116, 156, 199, 0.24);
      border-radius: 24px;
      box-shadow: 0 24px 60px rgba(16, 44, 80, 0.12);
      overflow: hidden;
    }
    .sheet-header {
      padding: 24px 28px 18px;
      border-bottom: 1px solid rgba(116, 156, 199, 0.18);
      background: linear-gradient(135deg, rgba(24, 103, 214, 0.96), rgba(28, 165, 180, 0.92));
      color: #fff;
    }
    .sheet-header small {
      display: inline-flex;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.18);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      font-weight: 600;
    }
    .sheet-header h1 {
      margin: 14px 0 4px;
      font-size: 30px;
      line-height: 1.15;
    }
    .sheet-header p {
      margin: 0;
      opacity: 0.88;
    }
    pre {
      margin: 0;
      padding: 28px;
      white-space: pre-wrap;
      word-break: break-word;
      font: 16px/1.7 "Georgia", "Times New Roman", serif;
      color: #1f3953;
      background: #fff;
    }
  </style>
</head>
<body>
  <main class="sheet">
    <header class="sheet-header">
      <small>Prepared viewer</small>
      <h1>${escapeHtml(title || originalFileName || 'Text document')}</h1>
      <p>${escapeHtml(originalFileName || 'text-document.txt')}</p>
    </header>
    <pre>${escapeHtml(textContent)}</pre>
  </main>
</body>
</html>
`;

const findLibreOfficeBinary = async () => {
    if (discoveredLibreOfficePath !== undefined) {
        return discoveredLibreOfficePath;
    }

    const candidates = [
        process.env.LIBREOFFICE_BIN,
        'soffice',
        'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
        'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
        '/usr/bin/soffice',
        '/usr/local/bin/soffice',
    ].filter(Boolean);

    for (const candidate of candidates) {
        try {
            if (candidate.includes(path.sep) || candidate.includes('/')) {
                await fs.access(candidate);
            }

            await execFileAsync(candidate, ['--version'], { timeout: 8000 });
            discoveredLibreOfficePath = candidate;
            return discoveredLibreOfficePath;
        } catch (error) {
            continue;
        }
    }

    discoveredLibreOfficePath = null;
    return null;
};

const convertOfficeDocumentToPdf = async ({ sourcePath, outputDirectory }) => {
    const libreOfficeBinary = await findLibreOfficeBinary();

    if (!libreOfficeBinary) {
        const error = new Error(
            'LibreOffice headless was not found. Set LIBREOFFICE_BIN or install LibreOffice on the server.'
        );
        error.code = 'LIBREOFFICE_MISSING';
        throw error;
    }

    await execFileAsync(
        libreOfficeBinary,
        [
            '--headless',
            '--nologo',
            '--nodefault',
            '--nofirststartwizard',
            '--nolockcheck',
            '--convert-to',
            'pdf',
            '--outdir',
            outputDirectory,
            sourcePath,
        ],
        {
            timeout: Number(process.env.DOCUMENT_PREVIEW_CONVERT_TIMEOUT_MS || 120000),
            windowsHide: true,
        }
    );

    const convertedPdfPath = path.join(
        outputDirectory,
        `${path.parse(sourcePath).name}.pdf`
    );

    await fs.access(convertedPdfPath);

    return {
        libreOfficeBinary,
        convertedPdfPath,
    };
};

const buildReadyManifest = ({
    documentId,
    sourceHash,
    originalFileName,
    mimeType,
    converter,
    viewerKind,
    viewerMimeType,
    viewerPath,
}) => ({
    version: PREVIEW_VERSION,
    documentId: Number(documentId),
    status: 'ready',
    sourceHash,
    originalFileName,
    mimeType,
    converter,
    reason: null,
    generatedAt: new Date().toISOString(),
    viewer: {
        kind: viewerKind,
        mimeType: viewerMimeType,
        url: toUploadPublicUrl(viewerPath),
    },
});

const prepareTextPreview = async ({
    documentId,
    previewDir,
    sourceHash,
    originalFileName,
    mimeType,
    title,
    buffer,
}) => {
    const viewerPath = path.join(previewDir, PREVIEW_HTML_NAME);
    const html = buildTextPreviewHtml({
        title,
        originalFileName,
        textContent: buffer.toString('utf8'),
    });

    await fs.writeFile(viewerPath, html, 'utf8');

    return buildReadyManifest({
        documentId,
        sourceHash,
        originalFileName,
        mimeType,
        converter: 'native_text_html',
        viewerKind: 'html',
        viewerMimeType: 'text/html',
        viewerPath,
    });
};

const preparePdfPreview = async ({
    documentId,
    previewDir,
    sourceHash,
    originalFileName,
    mimeType,
    buffer,
}) => {
    const viewerPath = path.join(previewDir, PREVIEW_PDF_NAME);
    await fs.writeFile(viewerPath, buffer);

    return buildReadyManifest({
        documentId,
        sourceHash,
        originalFileName,
        mimeType,
        converter: 'native_pdf_copy',
        viewerKind: 'pdf',
        viewerMimeType: 'application/pdf',
        viewerPath,
    });
};

const prepareOfficePreview = async ({
    documentId,
    previewDir,
    sourceHash,
    originalFileName,
    mimeType,
    buffer,
}) => {
    const workDir = await createPreviewWorkDirectory(documentId);
    const extension = inferExtension({ originalFileName, mimeType }) || '.bin';
    const sourcePath = path.join(workDir, `source${extension}`);

    try {
        await fs.writeFile(sourcePath, buffer);

        const { libreOfficeBinary, convertedPdfPath } = await withRetry(
            () =>
                convertOfficeDocumentToPdf({
                    sourcePath,
                    outputDirectory: workDir,
                }),
            {
                attempts: PREVIEW_CONVERT_RETRY_ATTEMPTS,
                delayMs: PREVIEW_CONVERT_RETRY_DELAY_MS,
                shouldRetry: (error) => {
                    const code = String(error?.code || '').toUpperCase();
                    const message = String(error?.message || '').toLowerCase();
                    return (
                        code === 'ETIMEDOUT' ||
                        code === 'EBUSY' ||
                        code === 'EPERM' ||
                        message.includes('timed out') ||
                        message.includes('busy') ||
                        message.includes('file is locked')
                    );
                },
            }
        );

        const viewerPath = path.join(previewDir, PREVIEW_PDF_NAME);
        await fs.copyFile(convertedPdfPath, viewerPath);

        return buildReadyManifest({
            documentId,
            sourceHash,
            originalFileName,
            mimeType,
            converter: `libreoffice:${libreOfficeBinary}`,
            viewerKind: 'pdf',
            viewerMimeType: 'application/pdf',
            viewerPath,
        });
    } finally {
        await safeRemoveDirectory(workDir).catch(() => undefined);
    }
};

const prepareDocumentPreview = async ({
    documentId,
    fileUrl,
    originalFileName,
    mimeType,
    title = null,
    buffer = null,
    force = false,
}) => {
    const numericDocumentId = Number(documentId);
    const inFlight = previewPreparationInFlight.get(numericDocumentId);

    if (inFlight) {
        return inFlight;
    }

    const job = (async () => {
        const actualBuffer = buffer
            ? buffer
            : await withRetry(() => downloadStoredDocumentBuffer(fileUrl), {
                attempts: PREVIEW_FETCH_RETRY_ATTEMPTS,
                delayMs: PREVIEW_FETCH_RETRY_DELAY_MS,
                shouldRetry: (error) => {
                    const code = String(error?.code || '').toUpperCase();
                    const message = String(error?.message || '').toLowerCase();
                    return (
                        code === 'ETIMEDOUT' ||
                        code === 'ECONNRESET' ||
                        code === 'ECONNREFUSED' ||
                        code === 'EAI_AGAIN' ||
                        message.includes('http status 5') ||
                        message.includes('timed out') ||
                        message.includes('network')
                    );
                },
            });
        const sourceHash = hashBuffer(actualBuffer);
        const existingManifest = await readManifest(numericDocumentId);

        if (
            !force &&
            existingManifest &&
            existingManifest.version === PREVIEW_VERSION &&
            existingManifest.sourceHash === sourceHash
        ) {
            return existingManifest;
        }

        const extension = inferExtension({ originalFileName, mimeType });
        const previewDir = await ensurePreviewDirectory(numericDocumentId);

        try {
            await cleanupPreviewArtifacts(previewDir);
            let manifest;

            if (PDF_EXTENSIONS.has(extension)) {
                manifest = await preparePdfPreview({
                    documentId: numericDocumentId,
                    previewDir,
                    sourceHash,
                    originalFileName,
                    mimeType,
                    buffer: actualBuffer,
                });
            } else if (TEXT_EXTENSIONS.has(extension)) {
                manifest = await prepareTextPreview({
                    documentId: numericDocumentId,
                    previewDir,
                    sourceHash,
                    originalFileName,
                    mimeType,
                    title,
                    buffer: actualBuffer,
                });
            } else if (OFFICE_EXTENSIONS.has(extension)) {
                manifest = await prepareOfficePreview({
                    documentId: numericDocumentId,
                    previewDir,
                    sourceHash,
                    originalFileName,
                    mimeType,
                    buffer: actualBuffer,
                });
            } else {
                manifest = buildUnavailableManifest({
                    documentId: numericDocumentId,
                    sourceHash,
                    originalFileName,
                    mimeType,
                    reason: `Preview conversion is not supported for "${extension || 'unknown'}" files yet.`,
                });
            }

            await writeManifest(numericDocumentId, manifest);
            return manifest;
        } catch (error) {
            const manifest = buildUnavailableManifest({
                documentId: numericDocumentId,
                sourceHash,
                originalFileName,
                mimeType,
                reason: error.message,
                converter: OFFICE_EXTENSIONS.has(extension) ? 'libreoffice' : null,
            });

            await writeManifest(numericDocumentId, manifest);
            return manifest;
        }
    })();

    previewPreparationInFlight.set(numericDocumentId, job);

    try {
        return await job;
    } finally {
        previewPreparationInFlight.delete(numericDocumentId);
    }
};

const getPreparedDocumentViewer = async ({
    documentId,
    fileUrl,
    originalFileName,
    mimeType,
    title = null,
    forcePrepare = false,
}) => {
    let manifest = await readManifest(documentId);

    if (!manifest || forcePrepare || manifest.status !== 'ready') {
        manifest = await prepareDocumentPreview({
            documentId,
            fileUrl,
            originalFileName,
            mimeType,
            title,
            force: forcePrepare,
        });
    }

    return {
        status: manifest?.status || 'missing',
        reason: manifest?.reason || null,
        converter: manifest?.converter || null,
        generatedAt: manifest?.generatedAt || null,
        viewerUrl: manifest?.viewer?.url || '',
        viewerKind: manifest?.viewer?.kind || null,
        viewerMimeType: manifest?.viewer?.mimeType || null,
    };
};

const getPreparedDocumentViewerFile = async (documentId) => {
    const manifest = await readManifest(documentId);

    if (!manifest || manifest.status !== 'ready' || !manifest.viewer) {
        return null;
    }

    const previewDir = getDocumentPreviewDir(documentId);
    const fileName =
        manifest.viewer.kind === 'html'
            ? PREVIEW_HTML_NAME
            : PREVIEW_PDF_NAME;
    const absolutePath = path.join(previewDir, fileName);

    await fs.access(absolutePath);

    return {
        absolutePath,
        mimeType: manifest.viewer.mimeType || 'application/octet-stream',
        kind: manifest.viewer.kind || null,
    };
};

const cleanupDocumentPreviewAssets = async (documentId) => {
    await safeRemoveDirectory(getDocumentPreviewDir(documentId));
};

module.exports = {
    prepareDocumentPreview,
    getPreparedDocumentViewer,
    getPreparedDocumentViewerFile,
    cleanupDocumentPreviewAssets,
};
