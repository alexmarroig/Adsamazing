import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';

import { env } from './env.js';

declare module 'fastify' {
  interface FastifyRequest {
    authUser: {
      userId: string;
      email?: string;
    };
  }

  interface FastifyInstance {
    requireAuth: (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>;
  }
}

const authPluginImpl: FastifyPluginAsync = async (app) => {
  await app.register(fastifyJwt, {
    secret: env.SUPABASE_JWT_SECRET,
  });

  app.decorate('requireAuth', async (request, reply) => {
    try {
      const decoded = (await request.jwtVerify()) as { sub?: string; email?: string };

      if (!decoded.sub) {
        return reply.code(401).send({
          data: null,
          error: { code: 'UNAUTHENTICATED', message: 'JWT inválido: sub ausente.' },
          meta: { requestId: request.id },
        });
      }

      request.authUser = {
        userId: decoded.sub,
        email: decoded.email,
      };
    } catch {
      return reply.code(401).send({
        data: null,
        error: { code: 'UNAUTHENTICATED', message: 'Token JWT inválido ou expirado.' },
        meta: { requestId: request.id },
      });
    }
  });
};

export const authPlugin = fp(authPluginImpl, { name: 'auth-plugin' });

