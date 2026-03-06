import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { Queue } from 'bullmq';

import { queueNames } from '@ads/shared';

import { env } from './env.js';

declare module 'fastify' {
  interface FastifyInstance {
    queues: Record<string, Queue>;
  }
}

const queuePluginImpl: FastifyPluginAsync = async (app) => {
  const connection = { url: env.REDIS_URL };

  const queues: Record<string, Queue> = Object.values(queueNames).reduce<Record<string, Queue>>((acc, queueName) => {
    acc[queueName] = new Queue(queueName, { connection });
    return acc;
  }, {});

  app.decorate('queues', queues);

  app.addHook('onClose', async () => {
    await Promise.all(Object.values(queues).map((queue) => queue.close()));
  });
};

export const queuePlugin = fp(queuePluginImpl, { name: 'queue-plugin' });

