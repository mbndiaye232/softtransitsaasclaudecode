const crypto = require('crypto');
require('dotenv').config();

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = Buffer.from(process.env.DOCUMENT_ENCRYPTION_KEY, 'hex');
const IV_LENGTH = 16;

/**
 * Encrypt a buffer
 * @param {Buffer} buffer 
 * @returns {Buffer} Encrypted buffer with IV prepended
 */
function encrypt(buffer) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
}

/**
 * Decrypt a buffer
 * @param {Buffer} buffer Encrypted buffer with IV prepended
 * @returns {Buffer} Decrypted buffer
 */
function decrypt(buffer) {
    const iv = buffer.slice(0, IV_LENGTH);
    const encryptedData = buffer.slice(IV_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted;
}

module.exports = {
    encrypt,
    decrypt
};
