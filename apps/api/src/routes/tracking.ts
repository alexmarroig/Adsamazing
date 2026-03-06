import type { FastifyPluginAsync } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';

import { prisma } from '@ads/db';

import { sendError, sendOk } from '../utils/response.js';

const clickSchema = z.object({
  landingPageSlug: z.string().min(1),
  source: z.string().optional(),
  medium: z.string().optional(),
  campaign: z.string().optional(),
  term: z.string().optional(),
  content: z.string().optional(),
  sessionKey: z.string().min(8),
});

const conversionSchema = z.object({
  sessionKey: z.string().min(8),
  clickId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  value: z.number().nonnegative().optional(),
  currencyCode: z.string().length(3).optional(),
  externalOrderId: z.string().optional(),
});

function hashIp(ip?: string): string | null {
  if (!ip) {
    return null;
  }

  return crypto.createHash('sha256').update(ip).digest('hex');
}

export const trackingRoutes: FastifyPluginAsync = async (app) => {
  app.post('/click', async (request, reply) => {
    const parsed = clickSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_BODY', message: parsed.error.message });
    }

    const landing = await prisma.landingPage.findFirst({
      where: {
        slug: parsed.data.landingPageSlug,
        status: 'published',
      },
      include: { user: true },
    });

    if (!landing) {
      return sendError(reply, request, 404, { code: 'LANDING_NOT_FOUND', message: 'Landing page não encontrada.' });
    }

    const session = await prisma.attributionSession.upsert({
      where: {
        userId_sessionKey: {
          userId: landing.userId,
          sessionKey: parsed.data.sessionKey,
        },
      },
      update: {
        lastNonDirectUtm: {
          source: parsed.data.source,
          medium: parsed.data.medium,
          campaign: parsed.data.campaign,
          term: parsed.data.term,
          content: parsed.data.content,
        },
      },
      create: {
        userId: landing.userId,
        sessionKey: parsed.data.sessionKey,
        lastNonDirectUtm: {
          source: parsed.data.source,
          medium: parsed.data.medium,
          campaign: parsed.data.campaign,
          term: parsed.data.term,
          content: parsed.data.content,
        },
      },
    });

    const click = await prisma.click.create({
      data: {
        userId: landing.userId,
        landingPageId: landing.id,
        attributionSessionId: session.id,
        source: parsed.data.source,
        medium: parsed.data.medium,
        campaign: parsed.data.campaign,
        term: parsed.data.term,
        content: parsed.data.content,
        ipHash: hashIp(request.ip),
        userAgent: request.headers['user-agent'],
      },
    });

    return sendOk(reply, request, { clickId: click.id });
  });

  app.post('/conversion', async (request, reply) => {
    const parsed = conversionSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_BODY', message: parsed.error.message });
    }

    const session = await prisma.attributionSession.findFirst({
      where: { sessionKey: parsed.data.sessionKey },
      select: { id: true, userId: true },
    });

    if (!session) {
      return sendError(reply, request, 404, { code: 'SESSION_NOT_FOUND', message: 'Sessão de atribuição não encontrada.' });
    }

    const conversion = await prisma.conversion.create({
      data: {
        userId: session.userId,
        attributionSessionId: session.id,
        clickId: parsed.data.clickId,
        productId: parsed.data.productId,
        value: parsed.data.value,
        currencyCode: parsed.data.currencyCode,
        externalOrderId: parsed.data.externalOrderId,
      },
    });

    return sendOk(reply, request, { conversionId: conversion.id });
  });
};

