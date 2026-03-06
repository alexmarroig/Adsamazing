import { existsSync } from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();
const rootEnvPath = path.resolve(process.cwd(), '../../.env');
if (existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath, override: false });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url(),
  ENCRYPTION_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),

  SUPABASE_JWT_SECRET: z.string().min(1),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
  GOOGLE_DEVELOPER_TOKEN: z.string().min(1),
  GOOGLE_OAUTH_SCOPES: z.string().min(1),
  GOOGLE_ADS_LOGIN_CUSTOMER_ID: z.string().optional(),

  ENABLE_SCRAPING_CONNECTOR: z.coerce.boolean().default(false),
});

export const env = envSchema.parse(process.env);
export type AppEnv = typeof env;

