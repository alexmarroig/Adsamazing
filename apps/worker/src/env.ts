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
  REDIS_URL: z.string().url(),
  OPENAI_API_KEY: z.string().optional(),
  ENABLE_SCRAPING_CONNECTOR: z.coerce.boolean().default(false),
  ENCRYPTION_KEY: z.string().default(''),
  LOG_LEVEL: z.string().default('info'),
});

export const env = envSchema.parse(process.env);
