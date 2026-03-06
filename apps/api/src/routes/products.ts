import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@ads/db';

import { fetchAffiliateNetworkProducts, rankProducts } from '@ads/affiliate-engine';
import { paginatedQuerySchema, productUpsertSchema, queueNames } from '@ads/shared';
import { prisma } from '@ads/db';
import { z } from 'zod';

import { sendError, sendOk } from '../utils/response.js';

const listProductsQuerySchema = paginatedQuerySchema.extend({
  category: z.string().optional(),
});

const discoverBodySchema = z.object({
  network: z.enum(['amazon', 'clickbank', 'hotmart', 'digistore24', 'cj', 'shareasale']).optional(),
  query: z.string().optional(),
});

export const productsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const parsed = listProductsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_QUERY', message: parsed.error.message });
    }

    const products = await prisma.product.findMany({
      where: {
        userId: request.authUser.userId,
        category: parsed.data.category,
      },
      include: { signals: true, affiliateNetwork: true },
      orderBy: { updatedAt: 'desc' },
      take: parsed.data.limit + 1,
      cursor: parsed.data.cursor ? { id: parsed.data.cursor } : undefined,
      skip: parsed.data.cursor ? 1 : 0,
    });

    const hasNextPage = products.length > parsed.data.limit;
    const results = hasNextPage ? products.slice(0, parsed.data.limit) : products;

    return sendOk(reply, request, results, {
      cursor: hasNextPage ? results.at(-1)?.id : undefined,
      hasNextPage,
    });
  });

  app.post('/discover', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const parsed = discoverBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_BODY', message: parsed.error.message });
    }

    const payload = {
      userId: request.authUser.userId,
      network: parsed.data.network,
      query: parsed.data.query,
    };

    const job = await app.queues[queueNames.productDiscovery].add('discover-products', payload, {
      removeOnComplete: 100,
      removeOnFail: 300,
      attempts: 5,
      backoff: { type: 'exponential', delay: 2_000 },
      jobId: `${payload.userId}:${payload.network ?? 'all'}:${payload.query ?? 'default'}:${Date.now()}`,
    });

    await prisma.job.create({
      data: {
        userId: payload.userId,
        queueName: queueNames.productDiscovery,
        jobName: 'discover-products',
        idempotencyKey: `${payload.userId}:${parsed.data.network ?? 'all'}:${parsed.data.query ?? 'default'}:${new Date().toISOString()}`,
        payload: payload as Prisma.InputJsonValue,
      },
    });

    return sendOk(reply, request, { jobId: job.id, queueName: queueNames.productDiscovery });
  });

  app.post('/', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const parsed = productUpsertSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_BODY', message: parsed.error.message });
    }

    const network = await prisma.affiliateNetwork.upsert({
      where: { slug: parsed.data.network },
      update: { isEnabled: true },
      create: {
        slug: parsed.data.network,
        name: parsed.data.network.toUpperCase(),
      },
    });

    const product = await prisma.product.upsert({
      where: {
        userId_affiliateNetworkId_externalId: {
          userId: request.authUser.userId,
          affiliateNetworkId: network.id,
          externalId: parsed.data.externalId,
        },
      },
      update: {
        title: parsed.data.title,
        category: parsed.data.category,
        price: parsed.data.price,
        currencyCode: parsed.data.currencyCode,
        commissionPct: parsed.data.commissionPct,
        popularityScore: parsed.data.popularityScore,
        salesRank: parsed.data.salesRank,
        reviewScore: parsed.data.reviewScore,
        sourceUrl: parsed.data.sourceUrl,
      },
      create: {
        userId: request.authUser.userId,
        affiliateNetworkId: network.id,
        externalId: parsed.data.externalId,
        title: parsed.data.title,
        category: parsed.data.category,
        price: parsed.data.price,
        currencyCode: parsed.data.currencyCode,
        commissionPct: parsed.data.commissionPct,
        popularityScore: parsed.data.popularityScore,
        salesRank: parsed.data.salesRank,
        reviewScore: parsed.data.reviewScore,
        sourceUrl: parsed.data.sourceUrl,
      },
    });

    return sendOk(reply, request, product);
  });

  app.post('/rank', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const bodySchema = z.object({ network: z.string(), query: z.string().optional() });
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_BODY', message: parsed.error.message });
    }

    const discovered = await fetchAffiliateNetworkProducts(parsed.data.network, parsed.data.query);
    const ranked = rankProducts(discovered);

    return sendOk(reply, request, ranked);
  });
};

