import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
    const key = process.env.MT5_ENCRYPTION_KEY;
    if (!key) {
        throw new Error('MT5_ENCRYPTION_KEY environment variable is not set');
    }
    // Ensure key is exactly 32 bytes for AES-256
    return crypto.scryptSync(key, 'salt', 32);
}

/**
 * Encrypts a plaintext string using AES-256-CBC
 * @param plaintext The text to encrypt
 * @returns Base64 encoded string containing IV + encrypted data
 */
export function encrypt(plaintext: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Prepend IV to encrypted data (IV is not secret, just needs to be unique)
    const ivBase64 = iv.toString('base64');
    return `${ivBase64}:${encrypted}`;
}

/**
 * Decrypts an encrypted string
 * @param ciphertext Base64 encoded string with IV:encryptedData format
 * @returns Decrypted plaintext
 */
export function decrypt(ciphertext: string): string {
    const key = getEncryptionKey();
    const [ivBase64, encrypted] = ciphertext.split(':');

    if (!ivBase64 || !encrypted) {
        throw new Error('Invalid ciphertext format');
    }

    const iv = Buffer.from(ivBase64, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
