const { Readable } = require('stream');
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

module.exports = {
    uploadDocumentBuffer,
};
