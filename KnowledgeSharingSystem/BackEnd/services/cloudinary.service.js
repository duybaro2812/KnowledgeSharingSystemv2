const { Readable } = require('stream');
const fs = require('fs/promises');
const http = require('http');
const https = require('https');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');

const getCloudinaryConfigError = () => {
    const requiredEnvKeys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
    const missingKeys = requiredEnvKeys.filter((key) => !process.env[key]);

    if (missingKeys.length > 0) {
        return new Error(`Missing Cloudinary environment variables: ${missingKeys.join(', ')}.`);
    }

    return null;
};

const ensureCloudinaryConfigured = () => {
    const configError = getCloudinaryConfigError();

    if (configError) {
        throw configError;
    }

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
};

const uploadDocumentBuffer = async ({ buffer, originalFileName }) => {
    ensureCloudinaryConfigured();

    const sourceName = originalFileName || 'document.bin';
    const ext = path.extname(sourceName).replace('.', '').toLowerCase() || 'bin';
    const baseName = sourceName.replace(/\.[^/.]+$/, '');

    const sanitizedBaseName = baseName
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .slice(0, 80);
    const uniqueSuffix = Date.now();
    const publicIdWithExt = `${sanitizedBaseName || 'document'}-${uniqueSuffix}.${ext}`;

    const folder = process.env.CLOUDINARY_DOCUMENT_FOLDER || 'knowledge-sharing-system/documents';

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'raw',
                public_id: publicIdWithExt,
                overwrite: false,
            },
            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(result);
            }
        );

        Readable.from(buffer).pipe(uploadStream);
    });
};

const isCloudinaryAssetUrl = (url) => typeof url === 'string' && url.includes('res.cloudinary.com');

const extractCloudinaryPublicIdFromUrl = (url) => {
    if (!isCloudinaryAssetUrl(url)) {
        return null;
    }

    try {
        const parsedUrl = new URL(url);
        const decodedPathname = decodeURIComponent(parsedUrl.pathname);
        const rawUploadMarker = '/raw/upload/';
        const markerIndex = decodedPathname.indexOf(rawUploadMarker);

        if (markerIndex === -1) {
            return null;
        }

        let publicId = decodedPathname.slice(markerIndex + rawUploadMarker.length);
        publicId = publicId.replace(/^v\d+\//, '');

        return publicId || null;
    } catch (error) {
        return null;
    }
};

const deleteCloudinaryRawByUrl = async (url) => {
    const publicId = extractCloudinaryPublicIdFromUrl(url);

    if (!publicId) {
        return { deleted: false, reason: 'invalid_cloudinary_url' };
    }

    ensureCloudinaryConfigured();

    const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'raw',
        invalidate: true,
    });

    if (result.result === 'ok' || result.result === 'not found') {
        return { deleted: result.result === 'ok', publicId };
    }

    throw new Error(`Cloudinary delete failed: ${result.result || 'unknown error'}`);
};

const deleteLocalUploadedFileByUrl = async (fileUrl) => {
    if (typeof fileUrl !== 'string' || !fileUrl.startsWith('/uploads/')) {
        return { deleted: false, reason: 'not_local_upload_url' };
    }

    const backendRoot = path.resolve(__dirname, '..');
    const uploadsRoot = path.resolve(backendRoot, process.env.UPLOAD_DIR || 'uploads');
    const relativeUrlPath = fileUrl.replace(/^\/+/, '');
    const targetFilePath = path.resolve(backendRoot, relativeUrlPath);

    if (!targetFilePath.startsWith(uploadsRoot)) {
        throw new Error('Refusing to delete file outside upload directory.');
    }

    try {
        await fs.unlink(targetFilePath);
        return { deleted: true, path: targetFilePath };
    } catch (error) {
        if (error.code === 'ENOENT') {
            return { deleted: false, reason: 'file_not_found' };
        }

        throw error;
    }
};

const downloadRemoteFileBuffer = (fileUrl) =>
    new Promise((resolve, reject) => {
        let parsedUrl;

        try {
            parsedUrl = new URL(fileUrl);
        } catch (error) {
            reject(new Error('Invalid remote file URL.'));
            return;
        }

        const client = parsedUrl.protocol === 'https:' ? https : http;

        const request = client.get(parsedUrl, (response) => {
            if (
                response.statusCode &&
                response.statusCode >= 300 &&
                response.statusCode < 400 &&
                response.headers.location
            ) {
                downloadRemoteFileBuffer(response.headers.location).then(resolve).catch(reject);
                response.resume();
                return;
            }

            if (response.statusCode !== 200) {
                reject(
                    new Error(`Failed to download remote file. HTTP status ${response.statusCode}.`)
                );
                response.resume();
                return;
            }

            const chunks = [];

            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        });

        request.on('error', reject);
    });

const readLocalUploadedFileBuffer = async (fileUrl) => {
    if (typeof fileUrl !== 'string' || !fileUrl.startsWith('/uploads/')) {
        throw new Error('Unsupported local upload URL.');
    }

    const backendRoot = path.resolve(__dirname, '..');
    const uploadsRoot = path.resolve(backendRoot, process.env.UPLOAD_DIR || 'uploads');
    const relativeUrlPath = fileUrl.replace(/^\/+/, '');
    const targetFilePath = path.resolve(backendRoot, relativeUrlPath);

    if (!targetFilePath.startsWith(uploadsRoot)) {
        throw new Error('Refusing to read file outside upload directory.');
    }

    return fs.readFile(targetFilePath);
};

const downloadStoredDocumentBuffer = async (fileUrl) => {
    if (typeof fileUrl !== 'string' || !fileUrl.trim()) {
        throw new Error('fileUrl is required to download stored document.');
    }

    if (fileUrl.startsWith('/uploads/')) {
        return readLocalUploadedFileBuffer(fileUrl);
    }

    if (/^https?:\/\//i.test(fileUrl)) {
        return downloadRemoteFileBuffer(fileUrl);
    }

    throw new Error('Unsupported fileUrl format for stored document download.');
};

module.exports = {
    uploadDocumentBuffer,
    isCloudinaryAssetUrl,
    deleteCloudinaryRawByUrl,
    deleteLocalUploadedFileByUrl,
    downloadStoredDocumentBuffer,
};
