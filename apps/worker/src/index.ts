import { Queue, QueueEvents, Worker } from 'bullmq';
import pino from 'pino';

import { createBudgetAdjustment } from '@ads/ads-engine';
import { fetchAffiliateNetworkProducts, rankProducts } from '@ads/affiliate-engine';
import { embedKeywords, generateAdCopy, generateLandingBlocks } from '@ads/ai-engine';
import { Prisma, prisma } from '@ads/db';
import { scrapeProductPage } from '@ads/scraping-engine';
import { jobPayloadSchemas, queueNames } from '@ads/shared';

import { env } from './env.js';
import { processShopeeVideo } from './handlers/shopee-video-pipeline.js';

const logger = pino({
  name: 'ads-worker',
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
});

const connection = { url: env.REDIS_URL };

const queueNameList = Object.values(queueNames) as string[];

const queues = queueNameList.reduce<Record<string, Queue>>((acc, queueName) => {
  acc[queueName] = new Queue(queueName, { connection });
  return acc;
}, {});

const queueEvents = queueNameList.map((queueName) => new QueueEvents(queueName, { connection }));

async function updateJobStatusByPayload(data: unknown, status: 'RUNNING' | 'SUCCEEDED' | 'FAILED', result?: unknown, error?: string) {
  const payload = data as { userId?: string };
  if (!payload.userId) {
    return;
  }

  await prisma.job.updateMany({
    where: {
      userId: payload.userId,
      payload: {
        equals: data as Prisma.InputJsonValue,
      },
    },
    data: {
      status,
      result: result ? (result as Prisma.InputJsonValue) : undefined,
      error,
    },
  });
}

async function withDeadLetter(queueName: string, externalJobId: string | undefined, payload: unknown, error: unknown) {
  const message = error instanceof Error ? error.message : 'unknown worker error';
  await prisma.queueDeadLetter.create({
    data: {
      queueName,
      externalJobId,
      payload: payload as Prisma.InputJsonValue,
      error: message,
    },
  });
}

const workers: Worker[] = [
  new Worker(
    queueNames.productDiscovery,
    async (job) => {
      const input = jobPayloadSchemas[queueNames.productDiscovery].parse(job.data);
      await updateJobStatusByPayload(job.data, 'RUNNING');

      try {
        const network = input.network ?? 'clickbank';
        const discovered = await fetchAffiliateNetworkProducts(network, input.query);
        const ranked = rankProducts(discovered);

        const affiliateNetwork = await prisma.affiliateNetwork.upsert({
          where: { slug: network },
          update: { isEnabled: true },
          create: {
            slug: network,
            name: network.toUpperCase(),
          },
        });

        for (const item of ranked) {
          const product = await prisma.product.upsert({
            where: {
              userId_affiliateNetworkId_externalId: {
                userId: input.userId,
                affiliateNetworkId: affiliateNetwork.id,
                externalId: item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              },
            },
            update: {
              title: item.title,
              category: item.category,
              commissionPct: item.commissionPct,
            },
            create: {
              userId: input.userId,
              affiliateNetworkId: affiliateNetwork.id,
              externalId: item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              title: item.title,
              category: item.category,
              commissionPct: item.commissionPct,
            },
          });

          await prisma.productSignal.upsert({
            where: { productId: product.id },
            update: {
              searchDemand: item.searchDemand ?? 0,
              competitionLevel: item.competitionLevel ?? 0,
              estimatedCpc: item.estimatedCpc ?? 0,
              conversionSignal: item.conversionSignal ?? 0,
              rankingScore: item.rankingScore,
            },
            create: {
              productId: product.id,
              searchDemand: item.searchDemand ?? 0,
              competitionLevel: item.competitionLevel ?? 0,
              estimatedCpc: item.estimatedCpc ?? 0,
              conversionSignal: item.conversionSignal ?? 0,
              rankingScore: item.rankingScore,
            },
          });
        }

        await updateJobStatusByPayload(job.data, 'SUCCEEDED', { imported: ranked.length });
        return { imported: ranked.length };
      } catch (error) {
        await withDeadLetter(queueNames.productDiscovery, job.id?.toString(), job.data, error);
        await updateJobStatusByPayload(job.data, 'FAILED', undefined, error instanceof Error ? error.message : 'unknown error');
        throw error;
      }
    },
    { connection },
  ),
  new Worker(
    queueNames.productScrape,
    async (job) => {
      const input = jobPayloadSchemas[queueNames.productScrape].parse(job.data);
      await updateJobStatusByPayload(job.data, 'RUNNING');

      try {
        if (!env.ENABLE_SCRAPING_CONNECTOR) {
          await updateJobStatusByPayload(job.data, 'SUCCEEDED', { skipped: true, reason: 'scraping disabled' });
          return { skipped: true };
        }

        const scraped = await scrapeProductPage(input.url);

        await prisma.product.update({
          where: { id: input.productId },
          data: {
            title: scraped.title ?? undefined,
            sourceUrl: input.url,
          },
        });

        await updateJobStatusByPayload(job.data, 'SUCCEEDED', { scraped: true });
        return { scraped: true };
      } catch (error) {
        await withDeadLetter(queueNames.productScrape, job.id?.toString(), job.data, error);
        await updateJobStatusByPayload(job.data, 'FAILED', undefined, error instanceof Error ? error.message : 'unknown error');
        throw error;
      }
    },
    { connection },
  ),
  new Worker(
    queueNames.keywordIntel,
    async (job) => {
      const input = jobPayloadSchemas[queueNames.keywordIntel].parse(job.data);
      await updateJobStatusByPayload(job.data, 'RUNNING');

      try {
        const campaignKeywords = await prisma.keyword.findMany({
          where: {
            userId: input.userId,
            campaignId: input.campaignId,
          },
          take: 200,
        });

        const keywords = campaignKeywords.map((item: { text: string }) => item.text);
        if (keywords.length === 0) {
          await updateJobStatusByPayload(job.data, 'SUCCEEDED', { clusters: 0 });
          return { clusters: 0 };
        }

        const vectors = await embedKeywords({ apiKey: env.OPENAI_API_KEY, keywords });

        const clusters = keywords.reduce<Array<{ name: string; intent: string; keyword: string; vector: number[] }>>((acc: Array<{ name: string; intent: string; keyword: string; vector: number[] }>, keyword: string, index: number) => {
          const intent: 'buyer' | 'research' = /buy|comprar|desconto|oferta/i.test(keyword) ? 'buyer' : 'research';
          const name = intent === 'buyer' ? 'Buyer Intent' : 'Research Intent';
          acc.push({ name, intent, keyword, vector: vectors[index] ?? [] });
          return acc;
        }, []);

        for (const cluster of clusters) {
          const createdCluster = await prisma.keywordCluster.create({
            data: {
              userId: input.userId,
              campaignId: input.campaignId,
              name: cluster.name,
              intent: cluster.intent,
            },
          });

          await prisma.keyword.updateMany({
            where: {
              userId: input.userId,
              campaignId: input.campaignId,
              text: cluster.keyword,
            },
            data: {
              keywordClusterId: createdCluster.id,
              intent: cluster.intent,
            },
          });
        }

        await updateJobStatusByPayload(job.data, 'SUCCEEDED', { clusters: clusters.length });
        return { clusters: clusters.length };
      } catch (error) {
        await withDeadLetter(queueNames.keywordIntel, job.id?.toString(), job.data, error);
        await updateJobStatusByPayload(job.data, 'FAILED', undefined, error instanceof Error ? error.message : 'unknown error');
        throw error;
      }
    },
    { connection },
  ),
  new Worker(
    queueNames.landingGenerate,
    async (job) => {
      const input = jobPayloadSchemas[queueNames.landingGenerate].parse(job.data);
      await updateJobStatusByPayload(job.data, 'RUNNING');

      try {
        const product = await prisma.product.findFirst({ where: { id: input.productId, userId: input.userId } });
        if (!product) {
          throw new Error('Product not found');
        }

        const blocks = await generateLandingBlocks({
          apiKey: env.OPENAI_API_KEY,
          productName: product.title,
          audience: 'buyers',
          tone: 'direct-response',
        });

        const slug = `${product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

        const landing = await prisma.landingPage.create({
          data: {
            userId: input.userId,
            productId: product.id,
            slug,
            title: `${product.title} - Oferta Especial`,
            jsonBlocks: blocks as Prisma.InputJsonValue,
          },
        });

        await updateJobStatusByPayload(job.data, 'SUCCEEDED', { landingPageId: landing.id });
        return { landingPageId: landing.id };
      } catch (error) {
        await withDeadLetter(queueNames.landingGenerate, job.id?.toString(), job.data, error);
        await updateJobStatusByPayload(job.data, 'FAILED', undefined, error instanceof Error ? error.message : 'unknown error');
        throw error;
      }
    },
    { connection },
  ),
  new Worker(
    queueNames.campaignBuild,
    async (job) => {
      const input = jobPayloadSchemas[queueNames.campaignBuild].parse(job.data);
      await updateJobStatusByPayload(job.data, 'RUNNING');

      try {
        const product = await prisma.product.findFirst({ where: { id: input.productId, userId: input.userId } });
        if (!product) {
          throw new Error('Product not found');
        }

        const adCopy = await generateAdCopy({
          apiKey: env.OPENAI_API_KEY,
          niche: product.category ?? 'affiliate marketing',
          audience: 'buyers',
          intent: 'commercial',
          productName: product.title,
        });

        const campaign = await prisma.campaign.create({
          data: {
            userId: input.userId,
            adAccountId: input.adAccountId,
            productId: input.productId,
            name: `${product.title} Auto Campaign`,
            objective: input.objective,
            dailyBudgetMicros: input.dailyBudgetMicros,
          },
        });

        await prisma.ad.create({
          data: {
            userId: input.userId,
            campaignId: campaign.id,
            headline1: adCopy.headlines[0] ?? product.title,
            description1: adCopy.descriptions[0] ?? `Compre ${product.title}`,
            finalUrl: `https://example.com/l/${product.id}`,
          },
        });

        await updateJobStatusByPayload(job.data, 'SUCCEEDED', { campaignId: campaign.id });
        return { campaignId: campaign.id };
      } catch (error) {
        await withDeadLetter(queueNames.campaignBuild, job.id?.toString(), job.data, error);
        await updateJobStatusByPayload(job.data, 'FAILED', undefined, error instanceof Error ? error.message : 'unknown error');
        throw error;
      }
    },
    { connection },
  ),
  new Worker(
    queueNames.campaignOptimize,
    async (job) => {
      const input = jobPayloadSchemas[queueNames.campaignOptimize].parse(job.data);
      await updateJobStatusByPayload(job.data, 'RUNNING');

      try {
        const clicks = await prisma.click.count({ where: { userId: input.userId } });
        const conversions = await prisma.conversion.count({ where: { userId: input.userId } });
        const conversionValue = await prisma.conversion.aggregate({ where: { userId: input.userId }, _sum: { value: true } });

        const ctr = clicks > 0 ? conversions / clicks : 0;
        const cpc = clicks > 0 ? Number(conversionValue._sum.value ?? 0) / clicks : 0;
        const multiplier = createBudgetAdjustment({ ctr, cpc, conversions });

        const campaign = await prisma.campaign.findFirst({ where: { id: input.campaignId, userId: input.userId } });
        if (!campaign) {
          throw new Error('Campaign not found');
        }

        const currentBudget = Number(campaign.dailyBudgetMicros ?? BigInt(1_000_000));
        const nextBudget = BigInt(Math.max(Math.floor(currentBudget * multiplier), 1_000_000));

        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { dailyBudgetMicros: nextBudget },
        });

        await updateJobStatusByPayload(job.data, 'SUCCEEDED', { multiplier, nextBudget: nextBudget.toString() });
        return { multiplier, nextBudget: nextBudget.toString() };
      } catch (error) {
        await withDeadLetter(queueNames.campaignOptimize, job.id?.toString(), job.data, error);
        await updateJobStatusByPayload(job.data, 'FAILED', undefined, error instanceof Error ? error.message : 'unknown error');
        throw error;
      }
    },
    { connection },
  ),
  new Worker(
    queueNames.analyticsRollup,
    async (job) => {
      const input = jobPayloadSchemas[queueNames.analyticsRollup].parse(job.data);
      await updateJobStatusByPayload(job.data, 'RUNNING');

      try {
        const [clicks, conversions] = await Promise.all([
          prisma.click.count({ where: { userId: input.userId } }),
          prisma.conversion.count({ where: { userId: input.userId } }),
        ]);

        await updateJobStatusByPayload(job.data, 'SUCCEEDED', { clicks, conversions });
        return { clicks, conversions };
      } catch (error) {
        await withDeadLetter(queueNames.analyticsRollup, job.id?.toString(), job.data, error);
        await updateJobStatusByPayload(job.data, 'FAILED', undefined, error instanceof Error ? error.message : 'unknown error');
        throw error;
      }
    },
    { connection },
  ),
  new Worker(
    queueNames.affiliateReconcile,
    async (job) => {
      const input = jobPayloadSchemas[queueNames.affiliateReconcile].parse(job.data);
      await updateJobStatusByPayload(job.data, 'RUNNING');

      try {
        const count = await prisma.product.count({ where: { userId: input.userId } });
        await updateJobStatusByPayload(job.data, 'SUCCEEDED', { productsChecked: count });
        return { productsChecked: count };
      } catch (error) {
        await withDeadLetter(queueNames.affiliateReconcile, job.id?.toString(), job.data, error);
        await updateJobStatusByPayload(job.data, 'FAILED', undefined, error instanceof Error ? error.message : 'unknown error');
        throw error;
      }
    },
    { connection },
  ),
  new Worker(
    'shopee_video_processing',
    async (job) => {
      return processShopeeVideo(job.data, env.OPENAI_API_KEY);
    },
    { connection }
  ),
];

for (const worker of workers) {
  worker.on('completed', (job) => {
    logger.info({ queueName: worker.name, jobId: job.id }, 'job completed');
  });

  worker.on('failed', (job, error) => {
    logger.error({ queueName: worker.name, jobId: job?.id, err: error }, 'job failed');
  });
}

for (const eventSource of queueEvents) {
  eventSource.on('waiting', ({ jobId }) => {
    logger.debug({ queueName: eventSource.opts?.prefix ?? 'queue', jobId }, 'job waiting');
  });
}

const schedule = async (): Promise<void> => {
  await queues[queueNames.analyticsRollup].upsertJobScheduler(
    'analytics-rollup-hourly',
    { pattern: '0 * * * *' },
    {
      name: 'analytics-rollup-scheduled',
      data: {
        userId: '00000000-0000-0000-0000-000000000000',
      },
    },
  );

  await queues[queueNames.affiliateReconcile].upsertJobScheduler(
    'affiliate-reconcile-3hour',
    { pattern: '0 */3 * * *' },
    {
      name: 'affiliate-reconcile-scheduled',
      data: {
        userId: '00000000-0000-0000-0000-000000000000',
      },
    },
  );

  logger.info('Schedulers configured');
};

const shutdown = async (): Promise<void> => {
  logger.info('Shutting down worker...');
  await Promise.all(workers.map((worker) => worker.close()));
  await Promise.all(queueEvents.map((event) => event.close()));
  await Promise.all(Object.values(queues).map((queue) => queue.close()));
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

void schedule();

