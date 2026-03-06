import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { generateLandingBlocks } from '@ads/ai-engine';
import { Prisma, prisma } from '@ads/db';
import { generateLandingBodySchema, paginatedQuerySchema, queueNames } from '@ads/shared';

import { env } from '../plugins/env.js';
import { sendError, sendOk } from '../utils/response.js';

const listQuerySchema = paginatedQuerySchema.extend({ status: z.string().optional() });

export const landingPagesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/:slug', async (request, reply) => {
    const paramsSchema = z.object({ slug: z.string().min(1) });
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_PARAMS', message: parsed.error.message });
    }

    const landing = await prisma.landingPage.findFirst({
      where: { slug: parsed.data.slug, status: 'published' },
      include: { product: true },
    });

    if (!landing) {
      return sendError(reply, request, 404, { code: 'LANDING_NOT_FOUND', message: 'Landing page não encontrada.' });
    }

    return sendOk(reply, request, landing);
  });

  app.get('/', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_QUERY', message: parsed.error.message });
    }

    const items = await prisma.landingPage.findMany({
      where: {
        userId: request.authUser.userId,
        status: parsed.data.status,
      },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
      take: parsed.data.limit + 1,
      cursor: parsed.data.cursor ? { id: parsed.data.cursor } : undefined,
      skip: parsed.data.cursor ? 1 : 0,
    });

    const hasNextPage = items.length > parsed.data.limit;
    const data = hasNextPage ? items.slice(0, parsed.data.limit) : items;

    return sendOk(reply, request, data, {
      cursor: hasNextPage ? data.at(-1)?.id : undefined,
      hasNextPage,
    });
  });

  app.post('/generate', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const parsed = generateLandingBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_BODY', message: parsed.error.message });
    }

    const product = await prisma.product.findFirst({
      where: { id: parsed.data.productId, userId: request.authUser.userId },
    });

    if (!product) {
      return sendError(reply, request, 404, { code: 'PRODUCT_NOT_FOUND', message: 'Produto não encontrado.' });
    }

    const blocks = await generateLandingBlocks({
      apiKey: env.OPENAI_API_KEY,
      productName: product.title,
      audience: parsed.data.audience,
      tone: parsed.data.tone,
    });

    const slug = `${product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now()}`;

    const landingPage = await prisma.landingPage.create({
      data: {
        userId: request.authUser.userId,
        productId: product.id,
        slug,
        title: `${product.title} - Oferta`,
        jsonBlocks: blocks as Prisma.InputJsonValue,
      },
    });

    return sendOk(reply, request, landingPage);
  });

  app.post('/generate/async', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const parsed = generateLandingBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_BODY', message: parsed.error.message });
    }

    const job = await app.queues[queueNames.landingGenerate].add(
      'landing-generate',
      {
        userId: request.authUser.userId,
        productId: parsed.data.productId,
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: 100,
        removeOnFail: 300,
      },
    );

    return sendOk(reply, request, { jobId: job.id, queueName: queueNames.landingGenerate });
  });

  app.post('/:landingPageId/publish', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const paramsSchema = z.object({ landingPageId: z.string().uuid() });
    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return sendError(reply, request, 400, { code: 'INVALID_PARAMS', message: parsedParams.error.message });
    }

    const updated = await prisma.landingPage.updateMany({
      where: {
        id: parsedParams.data.landingPageId,
        userId: request.authUser.userId,
      },
      data: {
        status: 'published',
        publishedAt: new Date(),
      },
    });

    if (!updated.count) {
      return sendError(reply, request, 404, { code: 'LANDING_NOT_FOUND', message: 'Landing page não encontrada.' });
    }

    return sendOk(reply, request, { landingPageId: parsedParams.data.landingPageId, status: 'published' });
  });
};

