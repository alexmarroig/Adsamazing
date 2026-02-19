import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';

import { decrypt } from '../util/crypto.js';
import { getGoogleAdsAccessToken, listAccessibleCustomers } from '../util/googleAds.js';

const headerSchema = z.object({
  'x-user-id': z.string().uuid(),
});

export const googleAdsRoutes: FastifyPluginAsync = async (app) => {
  // Endpoint de teste: busca refresh_token salvo, troca por access_token e lista customers.
  app.get('/customers', async (request, reply) => {
    const parsedHeaders = headerSchema.safeParse(request.headers);
    if (!parsedHeaders.success) {
      return reply.code(400).send({ message: 'Header x-user-id (uuid) é obrigatório.' });
    }

    const userId = parsedHeaders.data['x-user-id'];

    try {
      const connection = await prisma.googleConnection.findFirst({
        where: { userId, provider: 'google' },
      });

      if (!connection) {
        return reply.code(404).send({ message: 'Nenhuma conexão Google encontrada para este usuário.' });
      }

      const refreshToken = decrypt(connection.refreshTokenEncrypted);
      const accessToken = await getGoogleAdsAccessToken(refreshToken);
      const customers = await listAccessibleCustomers(accessToken);

      return reply.send({
        message: 'Clientes acessíveis obtidos com sucesso.',
        data: customers,
      });
    } catch (error) {
      app.log.error({ err: error }, 'Erro ao consultar Google Ads');
      return reply.code(500).send({ message: 'Erro interno ao consultar Google Ads API.' });
    }
  });
};
