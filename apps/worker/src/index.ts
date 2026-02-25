import { Queue, QueueEvents, Worker } from 'bullmq';
import pino from 'pino';

import { env } from './env.js';

const logger = pino({
  name: 'ads-worker',
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
});

const connection = { url: env.REDIS_URL };
const queueName = 'sync_metrics';
const automationQueueName = 'automation_rules';

const queue = new Queue(queueName, { connection });
const automationQueue = new Queue(automationQueueName, { connection });

const queueEvents = new QueueEvents(queueName, { connection });

const worker = new Worker(
  queueName,
  async (job) => {
    logger.info({ jobId: job.id, name: job.name, userId: job.data.userId }, 'Processing sync_metrics job');
    // Aqui entraria a lógica de buscar dados do Google Ads e salvar no DB
    return { processedAt: new Date().toISOString() };
  },
  { connection },
);

const automationWorker = new Worker(
  automationQueueName,
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'Checking automation rules');

    // Simulação de verificação de regras
    // No mundo real, buscaríamos as regras do banco e os dados mais recentes do Google Ads
    // Se a condição fosse atingida, dispararíamos o ajuste via API do Google Ads

    return { executed: true, timestamp: new Date().toISOString() };
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

  await automationQueue.upsertJobScheduler(
    'check-automation-rules-every-5-minutes',
    { pattern: '*/5 * * * *' },
    {
      name: 'automation-rules-job',
      data: {},
    }
  );

  logger.info('Schedulers configured for metrics and automation queues');
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
