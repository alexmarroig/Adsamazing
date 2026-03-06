import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { prisma } from '@ads/db';

import { env } from '../plugins/env.js';
import { encrypt } from '../util/crypto.js';
import { sendError, sendOk } from '../utils/response.js';

const callbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export const oauthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/start', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const state = Buffer.from(JSON.stringify({ userId: request.authUser.userId, ts: Date.now() })).toString('base64url');

    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: env.GOOGLE_OAUTH_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
      include_granted_scopes: 'true',
    });

    return sendOk(reply, request, {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      state,
    });
  });

  app.get('/callback', async (request, reply) => {
    const parsedQuery = callbackQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return sendError(reply, request, 400, { code: 'INVALID_QUERY', message: 'code e state são obrigatórios.' });
    }

    let stateData: { userId: string; ts: number };
    try {
      stateData = JSON.parse(Buffer.from(parsedQuery.data.state, 'base64url').toString('utf8')) as {
        userId: string;
        ts: number;
      };
    } catch {
      return sendError(reply, request, 400, { code: 'INVALID_STATE', message: 'state inválido.' });
    }

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: parsedQuery.data.code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: env.GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        return sendError(reply, request, 502, { code: 'GOOGLE_TOKEN_EXCHANGE_FAILED', message: 'Falha ao trocar authorization code.' });
      }

      const tokenPayload = (await tokenResponse.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
        id_token?: string;
      };

      if (!tokenPayload.refresh_token || !tokenPayload.access_token) {
        return sendError(reply, request, 400, {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Google não retornou refresh_token. Refazer consentimento.',
        });
      }

      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
      });

      if (!userInfoResponse.ok) {
        return sendError(reply, request, 502, { code: 'GOOGLE_USERINFO_FAILED', message: 'Falha ao obter perfil Google.' });
      }

      const userInfo = (await userInfoResponse.json()) as { sub?: string; email?: string };
      if (!userInfo.sub || !userInfo.email) {
        return sendError(reply, request, 502, { code: 'GOOGLE_USERINFO_INVALID', message: 'Resposta de perfil inválida.' });
      }

      const user = await prisma.user.upsert({
        where: { id: stateData.userId },
        update: { email: userInfo.email },
        create: { id: stateData.userId, email: userInfo.email },
      });

      const expiresAt = new Date(Date.now() + (tokenPayload.expires_in ?? 3600) * 1000);

      await prisma.googleAccount.upsert({
        where: {
          userId_googleSub: {
            userId: user.id,
            googleSub: userInfo.sub,
          },
        },
        update: {
          email: userInfo.email,
          accessTokenEncrypted: encrypt(tokenPayload.access_token),
          refreshTokenEncrypted: encrypt(tokenPayload.refresh_token),
          tokenExpiresAt: expiresAt,
          scopes: tokenPayload.scope ?? env.GOOGLE_OAUTH_SCOPES,
        },
        create: {
          userId: user.id,
          googleSub: userInfo.sub,
          email: userInfo.email,
          accessTokenEncrypted: encrypt(tokenPayload.access_token),
          refreshTokenEncrypted: encrypt(tokenPayload.refresh_token),
          tokenExpiresAt: expiresAt,
          scopes: tokenPayload.scope ?? env.GOOGLE_OAUTH_SCOPES,
        },
      });

      await prisma.oAuthSecret.create({
        data: {
          userId: user.id,
          provider: 'google',
          keyVersion: 1,
          secretEncrypted: encrypt(tokenPayload.refresh_token),
        },
      });

      return sendOk(reply, request, { message: 'Google OAuth conectado com sucesso.' });
    } catch (error) {
      app.log.error({ err: error }, 'OAuth callback error');
      return sendError(reply, request, 500, { code: 'OAUTH_CALLBACK_ERROR', message: 'Erro interno no callback OAuth.' });
    }
  });
};

