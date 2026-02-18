import crypto from 'node:crypto';

import Fastify from 'fastify';

import {
  healthResponseSchema,
  meResponseSchema,
  oauthCallbackSchema,
  oauthStartSchema,
  userHeaderSchema,
} from '@ads/shared';

import { env } from './env.js';
import { logger } from './logger.js';

const app = Fastify({ logger });

app.addHook('preHandler', async (request, reply) => {
  if (!request.url.startsWith('/v1')) {
    return;
  }

  const parsedHeaders = userHeaderSchema.safeParse(request.headers);

  if (!parsedHeaders.success) {
    reply.code(401).send({ message: 'Missing or invalid x-user-id header' });
    return;
  }

  request.userId = parsedHeaders.data['x-user-id'];
});

app.get('/health', async () => {
  return healthResponseSchema.parse({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.get('/v1/me', async (request) => {
  return meResponseSchema.parse({
    id: request.userId,
    email: 'placeholder@adsautopilot.dev',
  });
});

app.get('/v1/google/oauth/start', async () => {
  const state = crypto.randomUUID();
  const scope = encodeURIComponent('https://www.googleapis.com/auth/adwords');
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(env.GOOGLE_OAUTH_CLIENT_ID)}&redirect_uri=${encodeURIComponent(env.GOOGLE_OAUTH_REDIRECT_URI)}&response_type=code&scope=${scope}&access_type=offline&state=${state}`;

  return oauthStartSchema.parse({
    url,
    state,
  });
});

app.get('/v1/google/oauth/callback', async (request) => {
  const query = request.query as { code?: string; state?: string };

  return oauthCallbackSchema.parse({
    message: 'OAuth callback placeholder. Exchange code and store encrypted tokens here.',
    code: query.code,
    state: query.state,
  });
});

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
    app.log.info(`API running on port ${env.API_PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}
