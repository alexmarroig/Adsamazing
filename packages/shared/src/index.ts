import crypto from 'node:crypto';
import { z } from 'zod';

export const userHeaderSchema = z.object({
  'x-user-id': z.string().uuid(),
});

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
});

export const meResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional(),
});

export const oauthStartSchema = z.object({
  url: z.string().url(),
  state: z.string(),
});

export const oauthCallbackSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  state: z.string().optional(),
});

export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export function encryptToken(plaintext: string, encryptionKeyB64: string): string {
  const key = Buffer.from(encryptionKeyB64, 'base64');

  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must decode to exactly 32 bytes.');
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptToken(ciphertextB64: string, encryptionKeyB64: string): string {
  const key = Buffer.from(encryptionKeyB64, 'base64');

  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must decode to exactly 32 bytes.');
  }

  const payload = Buffer.from(ciphertextB64, 'base64');
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
