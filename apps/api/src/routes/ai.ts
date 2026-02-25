import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { generateKeywordSuggestions, analyzeLandingPageSEO, generateAdImage } from '../util/ai.js';

const keywordSchema = z.object({
  niche: z.string().min(1),
  goals: z.string().min(1),
});

const seoSchema = z.object({
  url: z.string().url(),
});

const imageSchema = z.object({
  prompt: z.string().min(1),
  size: z.enum(['1024x1024', '1024x1792', '1792x1024']).default('1024x1024'),
});

export const aiRoutes: FastifyPluginAsync = async (app) => {
  app.post('/keywords/suggest', async (request, reply) => {
    const body = keywordSchema.parse(request.body);
    try {
      const suggestions = await generateKeywordSuggestions(body.niche, body.goals);
      return reply.send({ data: suggestions });
    } catch (error) {
      app.log.error({ err: error }, 'Erro ao gerar sugestões de palavras-chave');
      return reply.code(500).send({ message: 'Erro ao gerar sugestões de IA.' });
    }
  });

  app.post('/seo/analyze', async (request, reply) => {
    const body = seoSchema.parse(request.body);
    try {
      const analysis = await analyzeLandingPageSEO(body.url);
      return reply.send({ data: analysis });
    } catch (error) {
      app.log.error({ err: error }, 'Erro ao analisar SEO');
      return reply.code(500).send({ message: 'Erro ao analisar SEO com IA.' });
    }
  });

  app.post('/images/generate', async (request, reply) => {
    const body = imageSchema.parse(request.body);
    try {
      const imageUrl = await generateAdImage(body.prompt, body.size);
      return reply.send({ data: { url: imageUrl } });
    } catch (error) {
      app.log.error({ err: error }, 'Erro ao gerar imagem');
      return reply.code(500).send({ message: 'Erro ao gerar imagem com IA.' });
    }
  });
};
