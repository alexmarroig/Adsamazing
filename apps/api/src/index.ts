import Fastify from 'fastify';

import { env } from './plugins/env.js';
import { googleAdsRoutes } from './routes/googleAds.js';
import { oauthRoutes } from './routes/oauth.js';

const isProduction = process.env.NODE_ENV === 'production';

const logger = isProduction
  ? {
      level: 'info',
    }
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

const app = Fastify({ logger });

app.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
});

app.register(oauthRoutes, { prefix: '/v1/google/oauth' });
app.register(googleAdsRoutes, { prefix: '/v1/google/ads' });

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
