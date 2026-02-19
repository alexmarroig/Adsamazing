import crypto from 'node:crypto';

import { env } from '../plugins/env.js';

// Aceita chave em base64 (32 bytes após decode) ou string literal de 32 chars.
function getEncryptionKey(): Buffer {
  const raw = env.ENCRYPTION_KEY;

  try {
    const asBase64 = Buffer.from(raw, 'base64');
    if (asBase64.length === 32) {
      return asBase64;
    }
  } catch {
    // fallback abaixo
  }

  const utf8Key = Buffer.from(raw, 'utf8');
  if (utf8Key.length !== 32) {
    throw new Error('ENCRYPTION_KEY precisa ter 32 bytes (utf8) ou base64 de 32 bytes.');
  }

  return utf8Key;
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // payload: iv(12) + tag(16) + encrypted
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(encrypted: string): string {
  const key = getEncryptionKey();
  const payload = Buffer.from(encrypted, 'base64');

  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const content = payload.subarray(28);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(content), decipher.final()]).toString('utf8');
}
