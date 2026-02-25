import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { prisma } from '@ads/db';

import { env } from '../plugins/env.js';
import { encrypt } from '../util/crypto.js';

const callbackQuerySchema = z.object({
  code: z.string().min(1),
});

const headerSchema = z.object({
  'x-user-id': z.string().uuid(),
  'x-user-email': z.string().email().optional(),
});

export const oauthRoutes: FastifyPluginAsync = async (app) => {
  // 1) Redireciona para o Google OAuth consent screen.
  app.get('/start', async (_request, reply) => {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: env.GOOGLE_OAUTH_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
    });

    return reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  // 2) Recebe callback, troca code por token e salva refresh_token criptografado.
  app.get('/callback', async (request, reply) => {
    const parsedQuery = callbackQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.code(400).send({ message: 'Query param "code" é obrigatório.' });
    }

    const parsedHeaders = headerSchema.safeParse(request.headers);
    if (!parsedHeaders.success) {
      return reply
        .code(400)
        .send({ message: 'Headers x-user-id (uuid) e opcional x-user-email são necessários.' });
    }

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: parsedQuery.data.code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: env.GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorBody = await tokenResponse.text();
        app.log.error({ errorBody }, 'Erro no token endpoint do Google OAuth');
        return reply.code(502).send({ message: 'Falha ao trocar code por tokens.' });
      }

      const tokenPayload = (await tokenResponse.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
      };

      if (!tokenPayload.refresh_token || !tokenPayload.access_token) {
        return reply
          .code(400)
          .send({ message: 'Google não retornou refresh_token/access_token. Tente consent novamente.' });
      }

      const userId = parsedHeaders.data['x-user-id'];
      const userEmail = parsedHeaders.data['x-user-email'] ?? `${userId}@placeholder.local`;

      await prisma.user.upsert({
        where: { id: userId },
        update: { email: userEmail },
        create: { id: userId, email: userEmail },
      });

      const expiresAt = new Date(Date.now() + (tokenPayload.expires_in ?? 3600) * 1000);

      const existingConnection = await prisma.googleConnection.findFirst({
        where: { userId, provider: 'google' },
      });

      const payload = {
        accessTokenEncrypted: encrypt(tokenPayload.access_token),
        refreshTokenEncrypted: encrypt(tokenPayload.refresh_token),
        expiresAt,
        scope: tokenPayload.scope ?? env.GOOGLE_OAUTH_SCOPES,
      };

      if (existingConnection) {
        await prisma.googleConnection.update({
          where: { id: existingConnection.id },
          data: payload,
        });
      } else {
        await prisma.googleConnection.create({
          data: {
            userId,
            provider: 'google',
            ...payload,
          },
        });
      }

      return reply.send({ message: 'OAuth concluído com sucesso e refresh_token salvo com criptografia.' });
    } catch (error) {
      app.log.error({ err: error }, 'Erro inesperado no callback OAuth');
      return reply.code(500).send({ message: 'Erro interno ao processar callback OAuth.' });
    }
  });
};
