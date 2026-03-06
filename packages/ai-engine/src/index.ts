import OpenAI from 'openai';

export type AdCopyResult = {
  headlines: string[];
  descriptions: string[];
  sitelinks: string[];
  callouts: string[];
  snippets: string[];
};

export function getOpenAIClient(apiKey?: string): OpenAI {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required');
  }

  return new OpenAI({ apiKey });
}

export async function generateAdCopy(input: {
  apiKey?: string;
  niche: string;
  audience: string;
  intent: string;
  productName: string;
}): Promise<AdCopyResult> {
  const openai = getOpenAIClient(input.apiKey);

  const completion = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: 'You generate Google Ads assets. Return strict JSON with arrays: headlines, descriptions, sitelinks, callouts, snippets.',
      },
      {
        role: 'user',
        content: `Niche: ${input.niche}\nAudience: ${input.audience}\nIntent: ${input.intent}\nProduct: ${input.productName}`,
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'ad_copy',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            headlines: { type: 'array', items: { type: 'string' } },
            descriptions: { type: 'array', items: { type: 'string' } },
            sitelinks: { type: 'array', items: { type: 'string' } },
            callouts: { type: 'array', items: { type: 'string' } },
            snippets: { type: 'array', items: { type: 'string' } },
          },
          required: ['headlines', 'descriptions', 'sitelinks', 'callouts', 'snippets'],
        },
        strict: true,
      },
    },
  });

  const raw = completion.output_text || '{}';
  const parsed = JSON.parse(raw) as AdCopyResult;

  return parsed;
}

export async function embedKeywords(input: { apiKey?: string; keywords: string[] }): Promise<number[][]> {
  const openai = getOpenAIClient(input.apiKey);

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: input.keywords,
  });

  return response.data.map((item) => item.embedding);
}

export async function generateLandingBlocks(input: {
  apiKey?: string;
  productName: string;
  audience: string;
  tone: string;
}): Promise<Record<string, unknown>> {
  const openai = getOpenAIClient(input.apiKey);

  const completion = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: 'Return a JSON object with keys: headline, hero, benefits, testimonials, cta, faq, comparisonTable.',
      },
      {
        role: 'user',
        content: `Product: ${input.productName}\nAudience: ${input.audience}\nTone: ${input.tone}`,
      },
    ],
  });

  return JSON.parse(completion.output_text || '{}');
}

