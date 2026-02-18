import { existsSync } from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';
import { z } from 'zod';

const rootEnvPath = path.resolve(process.cwd(), '../../.env');

dotenv.config();
if (existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath, override: false });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url(),
  ENCRYPTION_KEY: z.string().min(1),
});

export const env = envSchema.parse(process.env);
