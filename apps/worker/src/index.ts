import { PrismaClient, Prisma, JobStatus } from '@ads/db';
import {
  createBudgetAdjustment,
  buildAdGroupStructure,
  createAdExtensions
} from '@ads/ads-engine';
import { generateAdCopy, generateLandingBlocks, embedKeywords } from '@ads/ai-engine';
import {
  queueNames,
  jobPayloadSchemas
} from '@ads/shared';
import { Queue, Worker, QueueEvents } from 'bullmq';
import pino from 'pino';

import { env } from './env.js';

const logger = pino({ level: env.LOG_LEVEL || 'info' });
const prisma = new PrismaClient();
const connection = { url: env.REDIS_URL };

import { decryptToken } from '@ads/shared';
function decrypt(encrypted: string): string {
  return decryptToken(encrypted, env.ENCRYPTION_KEY);
}

import {
  getGoogleAdsAccessToken,
  mutateGoogleAds,
  buildBudgetOperation,
  buildCampaignOperation,
  buildAdGroupOperation,
  buildKeywordOperation,
  buildAdOperation,
  getCampaignMetrics,
  getKeywordMetrics
} from '../../api/src/util/googleAds.js';

async function updateJobStatusByPayload(payload: any, status: JobStatus, result?: any, error?: string) {
  const userId = payload.userId;
  if (!userId) return;
  const idempotencyKey = payload.idempotencyKey;
  if (!idempotencyKey) return;
  await prisma.job.update({
    where: { userId_idempotencyKey: { userId, idempotencyKey } },
    data: { status, result: result as Prisma.InputJsonValue, error, updatedAt: new Date() },
  });
}

async function withDeadLetter(queueName: string, externalJobId: string | undefined, payload: any, error: unknown) {
  await prisma.queueDeadLetter.create({
    data: {
      queueName,
      externalJobId,
      payload: payload as Prisma.InputJsonValue,
      error: error instanceof Error ? error.stack || error.message : String(error),
    },
  });
}

const queues: Record<string, Queue> = Object.values(queueNames).reduce<Record<string, Queue>>((acc, name) => {
  acc[name] = new Queue(name, { connection });
  return acc;
}, {});

const queueEvents = Object.values(queueNames).map((name) => new QueueEvents(name, { connection }));

const workers = [
  new Worker(
    queueNames.productDiscovery,
    async (job) => {
      const input = jobPayloadSchemas[queueNames.productDiscovery].parse(job.data);
      await updateJobStatusByPayload(job.data, 'RUNNING');
      try {
        const results = [{ externalId: 'p1', title: 'Product 1' }];
        await updateJobStatusByPayload(job.data, 'SUCCEEDED', { count: results.length });
        return { count: results.length };
      } catch (error) {
        await withDeadLetter(queueNames.productDiscovery, job.id?.toString(), job.data, error);
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
        const campaign = await prisma.campaign.findFirst({
          where: { id: input.campaignId, userId: input.userId },
          include: { keywords: true },
        });
        if (!campaign || campaign.keywords.length === 0) throw new Error('Campaign or keywords not found');
        const keywords = campaign.keywords.map((k) => k.text);
        const vectors = await embedKeywords({ apiKey: env.OPENAI_API_KEY, keywords });
        const clusters = keywords.reduce<Array<any>>((acc: any[], keyword: string, index: number) => {
          const intent: 'buyer' | 'research' = /buy|comprar|desconto|oferta/i.test(keyword) ? 'buyer' : 'research';
          const name = intent === 'buyer' ? 'Buyer Intent' : 'Research Intent';
          acc.push({ name, intent, keyword, vector: vectors[index] ?? [] });
          return acc;
        }, []);
        for (const cluster of clusters) {
          const createdCluster = await prisma.keywordCluster.create({
            data: { userId: input.userId, campaignId: input.campaignId, name: cluster.name, intent: cluster.intent },
          });
          await prisma.keyword.updateMany({
            where: { userId: input.userId, campaignId: input.campaignId, text: cluster.keyword },
            data: { keywordClusterId: createdCluster.id, intent: cluster.intent },
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
    queueNames.campaignPublish,
    async (job) => {
      const input = jobPayloadSchemas[queueNames.campaignPublish].parse(job.data);
      await updateJobStatusByPayload(job.data, 'RUNNING');
      try {
        const campaign = await prisma.campaign.findFirst({
          where: { id: input.campaignId, userId: input.userId },
          include: {
            adAccount: { include: { googleAccount: true } },
            adGroups: { include: { keywords: true } },
            ads: true,
          },
        });
        if (!campaign || !campaign.adAccount || !campaign.adAccount.googleAccount) throw new Error('Campaign, AdAccount or Google account not found');

        const adAccount = campaign.adAccount as any;
        const refreshToken = decrypt(adAccount.googleAccount.refreshTokenEncrypted);
        const accessToken = await getGoogleAdsAccessToken(refreshToken);
        const customerId = adAccount.externalId;
        const dailyBudget = campaign.dailyBudgetMicros ? campaign.dailyBudgetMicros.toString() : '1000000';
        const budgetOp = buildBudgetOperation(dailyBudget);
        const budgetResult = await mutateGoogleAds(accessToken, customerId, [budgetOp]);
        const budgetResourceName = budgetResult.mutateOperationResponses[0].campaignBudgetResult.resourceName;
        const campaignOp = buildCampaignOperation({
          name: campaign.name, advertisingChannelType: 'SEARCH', status: 'PAUSED', dailyBudgetMicros: dailyBudget,
        });
        (campaignOp.campaignOperation.create as any).campaignBudget = budgetResourceName;
        const campaignResult = await mutateGoogleAds(accessToken, customerId, [campaignOp]);
        const campaignResourceName = campaignResult.mutateOperationResponses[0].campaignResult.resourceName;
        const googleCampaignId = campaignResourceName.split('/').pop();
        for (const localGroup of campaign.adGroups) {
          const groupOp = buildAdGroupOperation(campaignResourceName, localGroup.name);
          const groupResult = await mutateGoogleAds(accessToken, customerId, [groupOp]);
          const groupResourceName = groupResult.mutateOperationResponses[0].adGroupResult.resourceName;
          const keywordOps = localGroup.keywords.map(k => buildKeywordOperation(groupResourceName, k.text, 'PHRASE'));
          if (keywordOps.length > 0) await mutateGoogleAds(accessToken, customerId, keywordOps);
          const adsForGroup = campaign.ads.filter(a => a.adGroupId === localGroup.id || !a.adGroupId);
          const adOps = adsForGroup.map(a => buildAdOperation(groupResourceName, {
            headlines: [a.headline1, a.headline2, a.headline3].filter(Boolean) as string[],
            descriptions: [a.description1, a.description2].filter(Boolean) as string[],
            finalUrl: a.finalUrl,
          }));
          if (adOps.length > 0) await mutateGoogleAds(accessToken, customerId, adOps);
        }
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { googleCampaignId, status: 'PUBLISHED' },
        });
        await updateJobStatusByPayload(job.data, 'SUCCEEDED', { googleCampaignId });
        return { googleCampaignId };
      } catch (error) {
        await withDeadLetter(queueNames.campaignPublish, job.id?.toString(), job.data, error);
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
        const campaign = await prisma.campaign.findFirst({
          where: { id: input.campaignId, userId: input.userId },
          include: { adAccount: { include: { googleAccount: true } } },
        });
        if (!campaign || !campaign.adAccount || !campaign.adAccount.googleAccount || !campaign.googleCampaignId) {
          throw new Error('Campaign not found or not published');
        }

        const adAccount = campaign.adAccount as any;
        const refreshToken = decrypt(adAccount.googleAccount.refreshTokenEncrypted);
        const accessToken = await getGoogleAdsAccessToken(refreshToken);
        const customerId = adAccount.externalId;

        const metricsRes = await getCampaignMetrics(accessToken, customerId, campaign.googleCampaignId);
        const metrics = metricsRes[0]?.metrics;

        if (!metrics) {
          await updateJobStatusByPayload(job.data, 'SUCCEEDED', { message: 'No live metrics found yet' });
          return { message: 'No live metrics' };
        }

        const ctr = metrics.ctr || 0;
        const cpc = metrics.averageCpc ? Number(metrics.averageCpc) / 1_000_000 : 0;
        const conversions = Number(metrics.conversions || 0);

        const multiplier = createBudgetAdjustment({ ctr, cpc, conversions });

        if (multiplier !== 1) {
          const currentBudget = Number(campaign.dailyBudgetMicros || 1000000);
          const nextBudget = BigInt(Math.max(Math.floor(currentBudget * multiplier), 1_000_000));

          await mutateGoogleAds(accessToken, customerId, [{
            campaignOperation: {
              update: {
                resourceName: `customers/${customerId}/campaigns/${campaign.googleCampaignId}`,
                dailyBudgetMicros: nextBudget.toString(),
              },
              updateMask: 'daily_budget_micros',
            }
          }]);

          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { dailyBudgetMicros: nextBudget },
          });
        }

        const keywordMetrics = await getKeywordMetrics(accessToken, customerId, campaign.googleCampaignId);
        const pauseOps: any[] = [];
        for (const row of keywordMetrics) {
          const km = row.metrics;
          const kClicks = Number(km.clicks || 0);
          const kConversions = Number(km.conversions || 0);

          if (kClicks > 50 && kConversions === 0) {
            pauseOps.push({
              adGroupKeywordOperation: {
                update: {
                  resourceName: row.adGroupKeywordView.resourceName,
                  status: 'PAUSED',
                },
                updateMask: 'status',
              }
            });
          }
        }

        if (pauseOps.length > 0) {
          await mutateGoogleAds(accessToken, customerId, pauseOps);
        }

        await updateJobStatusByPayload(job.data, 'SUCCEEDED', { multiplier, pausedKeywords: pauseOps.length });
        return { multiplier, pausedKeywords: pauseOps.length };
      } catch (error) {
        await withDeadLetter(queueNames.campaignOptimize, job.id?.toString(), job.data, error);
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
        if (!product) throw new Error('Product not found');
        const blocks = await generateLandingBlocks({ apiKey: env.OPENAI_API_KEY, productName: product.title, audience: 'buyers', tone: 'direct-response' });
        const slug = `${product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
        const landing = await prisma.landingPage.create({
          data: { userId: input.userId, productId: product.id, slug, title: `${product.title} - Oferta Especial`, jsonBlocks: blocks as Prisma.InputJsonValue },
        });
        await updateJobStatusByPayload(job.data, 'SUCCEEDED', { landingPageId: landing.id });
        return { landingPageId: landing.id };
      } catch (error) {
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
        if (!product) throw new Error('Product not found');
        const adCopy = await generateAdCopy({ apiKey: env.OPENAI_API_KEY, niche: product.category ?? 'affiliate marketing', audience: 'buyers', intent: 'commercial', productName: product.title });
        const campaign = await prisma.campaign.create({
          data: { userId: input.userId, adAccountId: input.adAccountId, productId: input.productId, name: `${product.title} Auto Campaign`, objective: input.objective, dailyBudgetMicros: input.dailyBudgetMicros || BigInt(1000000) },
        });
        await prisma.ad.create({
          data: { userId: input.userId, campaignId: campaign.id, headline1: adCopy.headlines[0] ?? product.title, description1: adCopy.descriptions[0] ?? `Compre ${product.title}`, finalUrl: `https://example.com/l/${product.id}` },
        });
        await updateJobStatusByPayload(job.data, 'SUCCEEDED', { campaignId: campaign.id });
        return { campaignId: campaign.id };
      } catch (error) {
        await updateJobStatusByPayload(job.data, 'FAILED', undefined, error instanceof Error ? error.message : 'unknown error');
        throw error;
      }
    },
    { connection },
  ),
  new Worker(queueNames.analyticsRollup, async (job) => {
    const input = jobPayloadSchemas[queueNames.analyticsRollup].parse(job.data);
    await updateJobStatusByPayload(job.data, 'RUNNING');
    try {
      const [clicks, conversions] = await Promise.all([prisma.click.count({ where: { userId: input.userId } }), prisma.conversion.count({ where: { userId: input.userId } })]);
      await updateJobStatusByPayload(job.data, 'SUCCEEDED', { clicks, conversions });
      return { clicks, conversions };
    } catch (error) {
      await updateJobStatusByPayload(job.data, 'FAILED', undefined, error instanceof Error ? error.message : 'unknown error');
      throw error;
    }
  }, { connection }),
  new Worker(queueNames.affiliateReconcile, async (job) => {
    const input = jobPayloadSchemas[queueNames.affiliateReconcile].parse(job.data);
    await updateJobStatusByPayload(job.data, 'RUNNING');
    try {
      const count = await prisma.product.count({ where: { userId: input.userId } });
      await updateJobStatusByPayload(job.data, 'SUCCEEDED', { productsChecked: count });
      return { productsChecked: count };
    } catch (error) {
      await updateJobStatusByPayload(job.data, 'FAILED', undefined, error instanceof Error ? error.message : 'unknown error');
      throw error;
    }
  }, { connection }),
];

for (const worker of workers) {
  worker.on('completed', (job) => logger.info({ queueName: worker.name, jobId: job.id }, 'job completed'));
  worker.on('failed', (job, error) => logger.error({ queueName: worker.name, jobId: job?.id, err: error }, 'job failed'));
}

const schedule = async (): Promise<void> => {
  await queues[queueNames.analyticsRollup].upsertJobScheduler('analytics-rollup-hourly', { pattern: '0 * * * *' }, { name: 'analytics-rollup-scheduled', data: { userId: '00000000-0000-0000-0000-000000000000' } });
  await queues[queueNames.affiliateReconcile].upsertJobScheduler('affiliate-reconcile-3hour', { pattern: '0 */3 * * *' }, { name: 'affiliate-reconcile-scheduled', data: { userId: '00000000-0000-0000-0000-000000000000' } });
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
