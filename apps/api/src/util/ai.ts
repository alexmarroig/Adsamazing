import OpenAI from 'openai';
import { env } from '../plugins/env.js';

export class AiConfigurationError extends Error {
  constructor() {
    super('OPENAI_API_KEY is not configured.');
    this.name = 'AiConfigurationError';
  }
}

function getOpenAIClient() {
  if (!env.OPENAI_API_KEY) {
    throw new AiConfigurationError();
  }

  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
}

export async function generateKeywordSuggestions(niche: string, goals: string) {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Você é um especialista em Google Ads e SEO ultra avançado. Sugira as melhores palavras-chave, títulos de anúncios e melhorias de SEO baseadas no nicho e objetivos fornecidos. Retorne a resposta estritamente em formato JSON.',
      },
      {
        role: 'user',
        content: `Nicho: ${niche}\nObjetivos: ${goals}`,
      },
    ],
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}

export async function analyzeLandingPageSEO(url: string) {
    const openai = getOpenAIClient();
    // Em um cenário real, poderíamos dar fetch na URL.
    // Aqui vamos simular a análise baseada na URL e descrição.
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Analise a Landing Page fornecida e sugira otimizações de SEO e conversão (CRO). Retorne em formato JSON.',
        },
        {
          role: 'user',
          content: `URL: ${url}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

export async function generateAdImage(prompt: string, size: '1024x1024' | '1024x1792' | '1792x1024' = '1024x1024') {
  const openai = getOpenAIClient();
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: `Uma imagem profissional para anúncio do Google: ${prompt}. Estilo comercial, alta qualidade, iluminação limpa.`,
    n: 1,
    size: size,
  });

  return response.data[0].url;
}
