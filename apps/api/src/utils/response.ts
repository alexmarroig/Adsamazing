import type { FastifyReply, FastifyRequest } from 'fastify';

type ErrorPayload = {
  code: string;
  message: string;
};

export function sendOk<T>(reply: FastifyReply, request: FastifyRequest, data: T, meta?: Record<string, unknown>) {
  return reply.send({
    data,
    error: null,
    meta: {
      requestId: request.id,
      ...(meta ?? {}),
    },
  });
}

export function sendError(reply: FastifyReply, request: FastifyRequest, statusCode: number, error: ErrorPayload) {
  return reply.code(statusCode).send({
    data: null,
    error,
    meta: {
      requestId: request.id,
    },
  });
}

