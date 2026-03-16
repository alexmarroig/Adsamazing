import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ShopeeClient } from '@ads/shopee-engine';
import { generatePinterestContent } from '@ads/pinterest-engine';
import { prisma } from '@ads/db';
import { env } from '../plugins/env.js';
import { sendError, sendOk } from '../utils/response.js';

const discoverProductsSchema = z.object({
  query: z.string().default('technology'),
  minCommission: z.number().default(15),
  minRating: z.number().default(4.0),
});

const createVideoContentSchema = z.object({
  shopId: z.string(),
  itemId: z.string(),
  videoUrl: z.string().url().optional(),
});

export const shopeeRoutes: FastifyPluginAsync = async (app) => {
  app.get('/products', { preHandler: [app.requireAuth] }, async (request, reply) => {
    if (!env.SHOPEE_APP_ID || !env.SHOPEE_SECRET_KEY) {
      return sendError(reply, request, 400, {
        code: 'MISSING_CREDENTIALS',
        message: 'Shopee API credentials not configured',
      });
    }

    try {
      const client = new ShopeeClient({
        appId: env.SHOPEE_APP_ID,
        secretKey: env.SHOPEE_SECRET_KEY,
        affiliateId: env.SHOPEE_AFFILIATE_ID || 'default',
      });

      const products = await client.searchTechProducts();
      return sendOk(reply, request, { products, count: products.length });
    } catch (error) {
      app.log.error({ err: error }, 'Shopee product discovery error');
      return sendError(reply, request, 500, {
        code: 'DISCOVERY_ERROR',
        message: 'Failed to discover products',
      });
    }
  });

  app.post('/video-content', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const parsed = createVideoContentSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, request, 400, {
        code: 'INVALID_BODY',
        message: parsed.error.message,
      });
    }

    try {
      const { shopId, itemId } = parsed.data;

      if (!env.SHOPEE_APP_ID || !env.SHOPEE_SECRET_KEY) {
        return sendError(reply, request, 400, { code: 'MISSING_CREDENTIALS' });
      }

      const client = new ShopeeClient({
        appId: env.SHOPEE_APP_ID,
        secretKey: env.SHOPEE_SECRET_KEY,
        affiliateId: env.SHOPEE_AFFILIATE_ID || 'default',
      });

      const product = await client.getProductDetails(shopId, itemId);

      const job = await app.queues.shopeeVideoProcessing.add(
        'process-video',
        {
          userId: request.authUser.userId,
          shopeeProduct: product,
          videoUrl: product.videoUrls?.[0],
        },
        {
          jobId: `${shopId}:${itemId}:${Date.now()}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
        }
      );

      return sendOk(reply, request, { jobId: job.id, status: 'queued' });
    } catch (error) {
      app.log.error({ err: error }, 'Video content creation error');
      return sendError(reply, request, 500, {
        code: 'VIDEO_CREATION_ERROR',
        message: 'Failed to create video content',
      });
    }
  });
};
