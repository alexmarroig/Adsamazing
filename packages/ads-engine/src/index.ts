import { z } from 'zod';

const metricSchema = z.object({
  ctr: z.number(),
  cpc: z.number(),
  conversions: z.number(),
  roi: z.number().optional(),
});

export type CampaignMetric = z.infer<typeof metricSchema>;

export function createBudgetAdjustment(input: CampaignMetric): number {
  const data = metricSchema.parse(input);

  // Conservative guardrail for automated changes.
  if (data.conversions >= 10 && data.ctr >= 0.04 && data.cpc <= 2.5) {
    return 1.1;
  }

  if (data.conversions <= 1 && data.cpc > 4) {
    return 0.9;
  }

  return 1;
}

export function buildAdGroupStructure(keywords: string[]): Array<{ name: string; keywords: string[] }> {
  const groups = new Map<string, string[]>();
  for (const keyword of keywords) {
    const key = keyword.split(' ')[0]?.toLowerCase() || 'general';
    const existing = groups.get(key) ?? [];
    existing.push(keyword);
    groups.set(key, existing);
  }

  return Array.from(groups.entries()).map(([name, words]) => ({
    name: `Intent ${name}`,
    keywords: words,
  }));
}

export function createAdExtensions(productName: string): {
  sitelinks: string[];
  callouts: string[];
  snippets: string[];
} {
  return {
    sitelinks: [`Comprar ${productName}`, 'Ver Depoimentos', 'Comparar Planos', 'FAQ'],
    callouts: ['Suporte dedicado', 'Pagamento seguro', 'Otimizado para mobile', 'Oferta por tempo limitado'],
    snippets: ['Categorias: Premium, Starter, Pro'],
  };
}

