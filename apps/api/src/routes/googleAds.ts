import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { createAdExtensions } from '@ads/ads-engine';
import { prisma } from '@ads/db';

import { decrypt } from '../util/crypto.js';
import { getGoogleAdsAccessToken, listAccessibleCustomers, searchGoogleAds } from '../util/googleAds.js';
import { sendError, sendOk } from '../utils/response.js';

const selectAccountSchema = z.object({
  customerId: z.string().min(3),
  name: z.string().min(1),
  currencyCode: z.string().length(3).default('USD'),
  timeZone: z.string().default('America/Sao_Paulo'),
  managerId: z.string().optional(),
  isMcc: z.boolean().default(false),
});

export const googleAdsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/customers', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const userId = request.authUser.userId;

    try {
      const googleAccount = await prisma.googleAccount.findFirst({
        where: { userId },
        select: { refreshTokenEncrypted: true },
      });

      if (!googleAccount) {
        return sendError(reply, request, 404, {
          code: 'GOOGLE_ACCOUNT_NOT_FOUND',
          message: 'Conecte uma conta Google antes de listar customers.',
        });
      }

      const refreshToken = decrypt(googleAccount.refreshTokenEncrypted);
      const accessToken = await getGoogleAdsAccessToken(refreshToken);
      const customers = await listAccessibleCustomers(accessToken);

      return sendOk(reply, request, customers);
    } catch (error) {
      app.log.error({ err: error }, 'google ads customers error');
      return sendError(reply, request, 500, { code: 'GOOGLE_CUSTOMERS_ERROR', message: 'Falha ao listar customers.' });
    }
  });

  app.post('/accounts/select', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const parsed = selectAccountSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_BODY', message: parsed.error.message });
    }

    const userId = request.authUser.userId;
    const googleAccount = await prisma.googleAccount.findFirst({ where: { userId } });
    if (!googleAccount) {
      return sendError(reply, request, 404, { code: 'GOOGLE_ACCOUNT_NOT_FOUND', message: 'Conta Google não conectada.' });
    }

    const adAccount = await prisma.adAccount.upsert({
      where: {
        userId_customerId: {
          userId,
          customerId: parsed.data.customerId,
        },
      },
      update: {
        name: parsed.data.name,
        currencyCode: parsed.data.currencyCode,
        timeZone: parsed.data.timeZone,
        managerId: parsed.data.managerId,
        isMcc: parsed.data.isMcc,
      },
      create: {
        userId,
        googleAccountId: googleAccount.id,
        customerId: parsed.data.customerId,
        name: parsed.data.name,
        currencyCode: parsed.data.currencyCode,
        timeZone: parsed.data.timeZone,
        managerId: parsed.data.managerId,
        isMcc: parsed.data.isMcc,
      },
    });

    return sendOk(reply, request, adAccount);
  });

  app.get('/metrics', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const querySchema = z.object({ adAccountId: z.string().uuid() });
    const parsedQuery = querySchema.safeParse(request.query);

    if (!parsedQuery.success) {
      return sendError(reply, request, 400, { code: 'INVALID_QUERY', message: parsedQuery.error.message });
    }

    const adAccount = await prisma.adAccount.findFirst({
      where: { id: parsedQuery.data.adAccountId, userId: request.authUser.userId },
      include: { googleAccount: true },
    });

    if (!adAccount) {
      return sendError(reply, request, 404, { code: 'AD_ACCOUNT_NOT_FOUND', message: 'Conta de anúncio não encontrada.' });
    }

    try {
      const refreshToken = decrypt(adAccount.googleAccount.refreshTokenEncrypted);
      const accessToken = await getGoogleAdsAccessToken(refreshToken);

      const gaql = `
      SELECT
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.cost_micros,
        metrics.conversions_value
      FROM customer
      WHERE segments.date DURING LAST_30_DAYS`;

      const result = await searchGoogleAds(accessToken, adAccount.customerId, gaql, adAccount.managerId ?? undefined);
      return sendOk(reply, request, result.results?.[0] ?? {});
    } catch (error) {
      app.log.error({ err: error }, 'google ads metrics error');
      return sendError(reply, request, 500, { code: 'GOOGLE_METRICS_ERROR', message: 'Falha ao consultar métricas.' });
    }
  });

  app.get('/extensions/suggest', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const querySchema = z.object({ productName: z.string().min(1) });
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_QUERY', message: parsed.error.message });
    }

    return sendOk(reply, request, createAdExtensions(parsed.data.productName));
  });
};

