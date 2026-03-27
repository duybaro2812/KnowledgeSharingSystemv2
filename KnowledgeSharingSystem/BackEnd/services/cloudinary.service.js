const { Readable } = require('stream');
const fs = require('fs/promises');
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

    const sanitizedBaseName = (originalFileName || 'document')
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .slice(0, 80);

    const folder = process.env.CLOUDINARY_DOCUMENT_FOLDER || 'knowledge-sharing-system/documents';

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'raw',
                use_filename: true,
                unique_filename: true,
                filename_override: sanitizedBaseName || 'document',
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

module.exports = {
    uploadDocumentBuffer,
    isCloudinaryAssetUrl,
    deleteCloudinaryRawByUrl,
    deleteLocalUploadedFileByUrl,
};
