import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { prisma } from '@ads/db';
import { queueNames } from '@ads/shared';

import { sendError, sendOk } from '../utils/response.js';

const analyticsQuerySchema = z.object({
  adAccountId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const parsed = analyticsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_QUERY', message: parsed.error.message });
    }

    const userId = request.authUser.userId;
    const whereDate = {
      gte: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      lte: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
    };

    const [clicks, conversions, campaigns, topProducts, topKeywords, topAds] = await Promise.all([
      prisma.click.count({ where: { userId, createdAt: whereDate } }),
      prisma.conversion.findMany({ where: { userId, createdAt: whereDate }, select: { value: true } }),
      prisma.campaign.findMany({
        where: {
          userId,
          adAccountId: parsed.data.adAccountId,
        },
        select: {
          id: true,
          name: true,
          status: true,
          _count: { select: { keywords: true, ads: true } },
        },
      }),
      prisma.product.findMany({
        where: { userId },
        include: { signals: true },
        orderBy: { signals: { rankingScore: 'desc' } },
        take: 10,
      }),
      prisma.keyword.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.ad.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const conversionValue = conversions.reduce((acc, item) => acc + Number(item.value ?? 0), 0);
    const cpc = clicks > 0 ? conversionValue / clicks : 0;
    const ctr = campaigns.length > 0 ? clicks / (campaigns.length * 1000) : 0;
    const roi = conversionValue > 0 ? conversionValue / Math.max(campaigns.length, 1) : 0;

    return sendOk(reply, request, {
      overview: {
        clicks,
        conversions: conversions.length,
        revenue: conversionValue,
        cpc,
        ctr,
        roi,
      },
      topProducts,
      topKeywords,
      topAds,
      campaigns,
    });
  });

  app.post('/rollup', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const parsed = analyticsQuerySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_BODY', message: parsed.error.message });
    }

    const job = await app.queues[queueNames.analyticsRollup].add(
      'analytics-rollup',
      {
        userId: request.authUser.userId,
        adAccountId: parsed.data.adAccountId,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: 100,
        removeOnFail: 300,
      },
    );

    return sendOk(reply, request, { jobId: job.id, queueName: queueNames.analyticsRollup });
  });
};

