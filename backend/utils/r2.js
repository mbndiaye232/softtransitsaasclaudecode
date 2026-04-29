const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'softtransit-documents';

/**
 * Upload a buffer to R2
 * @param {string} key - Object key (filename)
 * @param {Buffer} buffer - File content
 * @param {string} contentType - MIME type
 */
async function uploadToR2(key, buffer, contentType = 'application/octet-stream') {
    await r2Client.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    }));
}

/**
 * Download a buffer from R2
 * @param {string} key - Object key (filename)
 * @returns {Buffer}
 */
async function downloadFromR2(key) {
    const res = await r2Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const chunks = [];
    for await (const chunk of res.Body) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

/**
 * Delete an object from R2
 * @param {string} key - Object key (filename)
 */
async function deleteFromR2(key) {
    await r2Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

module.exports = { uploadToR2, downloadFromR2, deleteFromR2 };
