const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey() {
  const secret = process.env.ENCRYPTION_KEY || 'default-dev-key-32chars!changeit!';
  return crypto.scryptSync(secret, 'greSioSalt', 32);
}

function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(typeof text === 'string' ? text : JSON.stringify(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encoded) {
  if (!encoded || typeof encoded !== 'string') return encoded;
  const parts = encoded.split(':');
  if (parts.length !== 3) return encoded;
  const [ivHex, tagHex, encrypted] = parts;
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  try { return JSON.parse(decrypted); } catch { return decrypted; }
}

module.exports = { encrypt, decrypt };
