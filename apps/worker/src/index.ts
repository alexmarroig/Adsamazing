import { Queue, QueueEvents, Worker } from 'bullmq';
import pino from 'pino';

import { env } from './env.js';

const logger = pino({
  name: 'ads-worker',
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
});

const connection = { url: env.REDIS_URL };
const queueName = 'sync_metrics';

const queue = new Queue(queueName, { connection });
const queueEvents = new QueueEvents(queueName, { connection });

const worker = new Worker(
  queueName,
  async (job) => {
    logger.info({ jobId: job.id, name: job.name, userId: job.data.userId }, 'Processing sync_metrics job');

    return { processedAt: new Date().toISOString() };
  },
  { connection },
);

worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Job completed');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Job failed');
});

queueEvents.on('waiting', ({ jobId }) => {
  logger.debug({ jobId }, 'Job waiting');
});

const schedule = async (): Promise<void> => {
  await queue.upsertJobScheduler(
    'sync-metrics-every-minute',
    { pattern: '*/1 * * * *' },
    {
      name: 'sync-metrics-job',
      data: {
        userId: '00000000-0000-0000-0000-000000000000',
      },
    },
  );

  logger.info('Scheduler configured for sync_metrics queue');
};

const shutdown = async (): Promise<void> => {
  logger.info('Shutting down worker...');
  await worker.close();
  await queueEvents.close();
  await queue.close();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

void schedule();
