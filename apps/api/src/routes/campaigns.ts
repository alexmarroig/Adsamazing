import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@ads/db';
import { z } from 'zod';

import { buildAdGroupStructure, createAdExtensions } from '@ads/ads-engine';
import { generateAdCopy } from '@ads/ai-engine';
import { prisma } from '@ads/db';
import { campaignBuildBodySchema, paginatedQuerySchema, queueNames } from '@ads/shared';

import { env } from '../plugins/env.js';
import { sendError, sendOk } from '../utils/response.js';

const listCampaignsQuerySchema = paginatedQuerySchema.extend({
  adAccountId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'PAUSED']).optional(),
});

const launchSchema = z.object({
  campaignId: z.string().uuid(),
  publishToGoogle: z.boolean().default(false),
});

export const campaignsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const parsed = listCampaignsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_QUERY', message: parsed.error.message });
    }

    const rows = await prisma.campaign.findMany({
      where: {
        userId: request.authUser.userId,
        adAccountId: parsed.data.adAccountId,
        status: parsed.data.status,
      },
      include: {
        adGroups: true,
        ads: true,
        keywords: true,
      },
      orderBy: { createdAt: 'desc' },
      take: parsed.data.limit + 1,
      cursor: parsed.data.cursor ? { id: parsed.data.cursor } : undefined,
      skip: parsed.data.cursor ? 1 : 0,
    });

    const hasNextPage = rows.length > parsed.data.limit;
    const data = hasNextPage ? rows.slice(0, parsed.data.limit) : rows;

    return sendOk(reply, request, data, {
      cursor: hasNextPage ? data.at(-1)?.id : undefined,
      hasNextPage,
    });
  });

  app.post('/build', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const parsed = campaignBuildBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_BODY', message: parsed.error.message });
    }

    const userId = request.authUser.userId;

    const [adAccount, product] = await Promise.all([
      prisma.adAccount.findFirst({ where: { id: parsed.data.adAccountId, userId } }),
      prisma.product.findFirst({ where: { id: parsed.data.productId, userId } }),
    ]);

    if (!adAccount || !product) {
      return sendError(reply, request, 404, {
        code: 'DEPENDENCY_NOT_FOUND',
        message: 'Conta de anúncio ou produto não encontrado.',
      });
    }

    const copy = await generateAdCopy({
      apiKey: env.OPENAI_API_KEY,
      niche: product.category ?? 'affiliate marketing',
      audience: 'buyers',
      intent: 'commercial',
      productName: product.title,
    });

    const baseKeywords = [
      `${product.title} comprar`,
      `${product.title} desconto`,
      `${product.title} review`,
      `melhor ${product.category ?? 'oferta'}`,
    ];

    const adGroups = buildAdGroupStructure(baseKeywords);
    const extensionPayload = createAdExtensions(product.title);

    const campaign = await prisma.$transaction(async (tx) => {
      const createdCampaign = await tx.campaign.create({
        data: {
          userId,
          adAccountId: adAccount.id,
          productId: product.id,
          name: `${product.title} - ${new Date().toISOString().slice(0, 10)}`,
          objective: parsed.data.objective,
          dailyBudgetMicros: parsed.data.dailyBudgetMicros,
        },
      });

      for (const group of adGroups) {
        const createdGroup = await tx.adGroup.create({
          data: {
            campaignId: createdCampaign.id,
            userId,
            name: group.name,
          },
        });

        for (const keyword of group.keywords) {
          await tx.keyword.create({
            data: {
              userId,
              campaignId: createdCampaign.id,
              adGroupId: createdGroup.id,
              text: keyword,
              intent: 'buyer',
            },
          });
        }
      }

      await tx.ad.create({
        data: {
          userId,
          campaignId: createdCampaign.id,
          headline1: copy.headlines[0] ?? product.title,
          headline2: copy.headlines[1],
          headline3: copy.headlines[2],
          description1: copy.descriptions[0] ?? `Compre ${product.title}`,
          description2: copy.descriptions[1],
          finalUrl: `https://example.com/l/${product.id}`,
        },
      });

      await tx.adExtension.createMany({
        data: [
          { campaignId: createdCampaign.id, userId, type: 'sitelink', payload: extensionPayload.sitelinks as Prisma.InputJsonValue },
          { campaignId: createdCampaign.id, userId, type: 'callout', payload: extensionPayload.callouts as Prisma.InputJsonValue },
          { campaignId: createdCampaign.id, userId, type: 'snippet', payload: extensionPayload.snippets as Prisma.InputJsonValue },
        ],
      });

      return createdCampaign;
    });

    return sendOk(reply, request, campaign);
  });

  app.post('/build/async', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const parsed = campaignBuildBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_BODY', message: parsed.error.message });
    }

    const job = await app.queues[queueNames.campaignBuild].add(
      'campaign-build',
      {
        userId: request.authUser.userId,
        adAccountId: parsed.data.adAccountId,
        productId: parsed.data.productId,
        objective: parsed.data.objective,
        dailyBudgetMicros: parsed.data.dailyBudgetMicros,
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: 100,
        removeOnFail: 300,
      },
    );

    return sendOk(reply, request, { jobId: job.id, queueName: queueNames.campaignBuild });
  });

  app.post('/launch', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const parsed = launchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_BODY', message: parsed.error.message });
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id: parsed.data.campaignId, userId: request.authUser.userId },
      include: { adAccount: true },
    });

    if (!campaign) {
      return sendError(reply, request, 404, { code: 'CAMPAIGN_NOT_FOUND', message: 'Campanha não encontrada.' });
    }

    if (parsed.data.publishToGoogle) {
      const idempotencyKey = `launch-${campaign.id}-${Date.now()}`;
      const job = await app.queues[queueNames.campaignPublish].add(
        'campaign-publish',
        {
          userId: request.authUser.userId,
          campaignId: campaign.id,
          idempotencyKey,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
        }
      );

      await prisma.job.create({
        data: {
          userId: request.authUser.userId,
          queueName: queueNames.campaignPublish,
          jobName: 'campaign-publish',
          status: 'QUEUED',
          idempotencyKey,
          payload: { campaignId: campaign.id } as Prisma.InputJsonValue,
        }
      });

      return sendOk(reply, request, { jobId: job.id, status: 'PUBLISHING_PENDING' });
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'PUBLISHED' },
    });

    return sendOk(reply, request, {
      campaignId: campaign.id,
      status: 'PUBLISHED',
      publishToGoogle: parsed.data.publishToGoogle,
    });
  });
};
