import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { embedKeywords, generateAdCopy, generateLandingBlocks } from '@ads/ai-engine';

import { env } from '../plugins/env.js';
import { sendError, sendOk } from '../utils/response.js';

const adCopySchema = z.object({
  niche: z.string().min(1),
  audience: z.string().min(1),
  intent: z.string().min(1),
  productName: z.string().min(1),
});

const embeddingsSchema = z.object({
  keywords: z.array(z.string().min(1)).min(1).max(200),
});

const landingSchema = z.object({
  productName: z.string().min(1),
  audience: z.string().default('broad'),
  tone: z.string().default('direct-response'),
});

export const aiRoutes: FastifyPluginAsync = async (app) => {
  app.post('/ad-copy/generate', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const parsed = adCopySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_BODY', message: parsed.error.message });
    }

    try {
      const data = await generateAdCopy({ apiKey: env.OPENAI_API_KEY, ...parsed.data });
      return sendOk(reply, request, data);
    } catch (error) {
      app.log.error({ err: error }, 'ad copy generation error');
      return sendError(reply, request, 500, { code: 'AI_GENERATION_ERROR', message: 'Falha ao gerar ad copy.' });
    }
  });

  app.post('/keywords/embeddings', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const parsed = embeddingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_BODY', message: parsed.error.message });
    }

    try {
      const vectors = await embedKeywords({ apiKey: env.OPENAI_API_KEY, keywords: parsed.data.keywords });
      return sendOk(reply, request, { vectors });
    } catch (error) {
      app.log.error({ err: error }, 'keywords embedding error');
      return sendError(reply, request, 500, { code: 'AI_EMBEDDING_ERROR', message: 'Falha ao gerar embeddings.' });
    }
  });

  app.post('/landing/blocks', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const parsed = landingSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_BODY', message: parsed.error.message });
    }

    try {
      const blocks = await generateLandingBlocks({ apiKey: env.OPENAI_API_KEY, ...parsed.data });
      return sendOk(reply, request, blocks);
    } catch (error) {
      app.log.error({ err: error }, 'landing block generation error');
      return sendError(reply, request, 500, { code: 'AI_LANDING_ERROR', message: 'Falha ao gerar landing blocks.' });
    }
  });
};

