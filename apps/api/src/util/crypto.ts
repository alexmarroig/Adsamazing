import { decryptToken, encryptToken } from '@ads/shared';

import { env } from '../plugins/env.js';

export function encrypt(text: string): string {
  return encryptToken(text, env.ENCRYPTION_KEY);
}

export function decrypt(encrypted: string): string {
  return decryptToken(encrypted, env.ENCRYPTION_KEY);
}

