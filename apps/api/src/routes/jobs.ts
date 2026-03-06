import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { queueEnqueueBodySchema } from '@ads/shared';
import { prisma } from '@ads/db';

import { sendError, sendOk } from '../utils/response.js';

export const jobsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const parsed = queueEnqueueBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_BODY', message: parsed.error.message });
    }

    const queue = app.queues[parsed.data.queueName];
    if (!queue) {
      return sendError(reply, request, 400, { code: 'QUEUE_NOT_FOUND', message: 'Fila inválida.' });
    }

    const existing = await prisma.job.findFirst({
      where: {
        userId: request.authUser.userId,
        idempotencyKey: parsed.data.idempotencyKey,
      },
    });

    if (existing) {
      return sendOk(reply, request, { jobId: existing.id, status: existing.status, deduplicated: true });
    }

    const queuedJob = await queue.add(parsed.data.queueName, {
      ...parsed.data.payload,
      userId: request.authUser.userId,
    }, {
      removeOnComplete: 100,
      removeOnFail: 300,
      attempts: 5,
      backoff: { type: 'exponential', delay: 2_000 },
    });

    const dbJob = await prisma.job.create({
      data: {
        userId: request.authUser.userId,
        queueName: parsed.data.queueName,
        jobName: parsed.data.queueName,
        idempotencyKey: parsed.data.idempotencyKey,
        payload: parsed.data.payload,
      },
    });

    return sendOk(reply, request, { jobId: queuedJob.id, dbJobId: dbJob.id, deduplicated: false });
  });

  app.get('/:jobId', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const paramsSchema = z.object({ jobId: z.string().uuid() });
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) {
      return sendError(reply, request, 400, { code: 'INVALID_PARAMS', message: parsed.error.message });
    }

    const job = await prisma.job.findFirst({
      where: {
        id: parsed.data.jobId,
        userId: request.authUser.userId,
      },
    });

    if (!job) {
      return sendError(reply, request, 404, { code: 'JOB_NOT_FOUND', message: 'Job não encontrado.' });
    }

    return sendOk(reply, request, job);
  });
};

