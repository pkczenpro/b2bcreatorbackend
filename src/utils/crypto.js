import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const secretKey = process.env.MESSAGE_SECRET_KEY
    ? crypto.createHash('sha256').update(process.env.MESSAGE_SECRET_KEY).digest('hex').slice(0, 32)
    : 'your-32-char-secret-key';  // Use a fallback key if not provided

const ivLength = 16;

export function encrypt(text) {
    const iv = crypto.randomBytes(ivLength); // Generate random IV
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Combine IV and encrypted message
    return iv.toString('hex') + ':' + encrypted;
}


export function decrypt(text) {
    // Split the input into IV and encrypted message parts
    const [ivHex, encrypted] = text.split(':');

    // Check if we received valid input
    if (!ivHex || !encrypted) {
        throw new Error('Invalid encrypted message format');
    }

    // Convert the IV from hex to a Buffer
    const iv = Buffer.from(ivHex, 'hex');

    // Create the decipher with the correct IV
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), iv);

    // Decrypt the message
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}


export default { encrypt, decrypt };
