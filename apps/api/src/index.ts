import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

import { prisma } from '@ads/db';

import { authPlugin } from './plugins/auth.js';
import { env } from './plugins/env.js';
import { queuePlugin } from './plugins/queues.js';
import { aiRoutes } from './routes/ai.js';
import { analyticsRoutes } from './routes/analytics.js';
import { campaignsRoutes } from './routes/campaigns.js';
import { googleAdsRoutes } from './routes/googleAds.js';
import { jobsRoutes } from './routes/jobs.js';
import { landingPagesRoutes } from './routes/landingPages.js';
import { oauthRoutes } from './routes/oauth.js';
import { productsRoutes } from './routes/products.js';
import { trackingRoutes } from './routes/tracking.js';
import { sendOk } from './utils/response.js';

const isProduction = env.NODE_ENV === 'production';

const logger = isProduction
  ? { level: 'info' }
  : {
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    };

const app = Fastify({ logger, trustProxy: true });

await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(rateLimit, {
  global: true,
  max: 200,
  timeWindow: '1 minute',
  keyGenerator: (request) => request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ?? request.ip,
});

await app.register(authPlugin);
await app.register(queuePlugin);

app.addHook('onResponse', async (request, reply) => {
  const userId = request.authUser?.userId;
  if (!userId || request.url.startsWith('/health')) {
    return;
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: request.method,
        resourceType: request.routeOptions.url ?? request.url,
        metadata: {
          statusCode: reply.statusCode,
          requestId: request.id,
        },
      },
    });
  } catch (error) {
    request.log.error({ err: error }, 'failed to create audit log');
  }
});

app.get('/health', async (request, reply) => {
  return sendOk(reply, request, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ads-api',
  });
});

app.register(oauthRoutes, { prefix: '/v1/google/oauth' });
app.register(googleAdsRoutes, { prefix: '/v1/google/ads' });
app.register(productsRoutes, { prefix: '/v1/products' });
app.register(landingPagesRoutes, { prefix: '/v1/landing-pages' });
app.register(campaignsRoutes, { prefix: '/v1/campaigns' });
app.register(analyticsRoutes, { prefix: '/v1/analytics' });
app.register(trackingRoutes, { prefix: '/v1/tracking' });
app.register(aiRoutes, { prefix: '/v1/ai' });
app.register(jobsRoutes, { prefix: '/v1/jobs' });

const start = async (): Promise<void> => {
  try {
    await app.listen({ host: '0.0.0.0', port: env.API_PORT });
    app.log.info(`API running on port ${env.API_PORT}`);
  } catch (error) {
    app.log.error(error, 'Failed to start API');
    process.exit(1);
  }
};

void start();

