import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// ENCRYPTION_KEY must be exactly 32 bytes (256 bits) for aes-256-gcm
// In production, store this in your environment variable securely (.env)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex') 
  : crypto.randomBytes(32); 

export interface EncryptedData {
  iv: string;
  authTag: string;
  encrypted: string;
}

export function encrypt(text: string): EncryptedData {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    iv: iv.toString('hex'),
    authTag,
    encrypted
  };
}

export function decrypt(data: EncryptedData): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(data.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
  
  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Helper to encrypt numeric values easily
export function encryptNumber(num: number): EncryptedData {
  return encrypt(num.toString());
}

// Helper to decrypt numeric values
export function decryptNumber(data: EncryptedData): number {
  return Number(decrypt(data));
}
