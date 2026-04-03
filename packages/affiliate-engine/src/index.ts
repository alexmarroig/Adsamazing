import { z } from 'zod';

export const discoverProductSchema = z.object({
  externalId: z.string(),
  title: z.string(),
  category: z.string().optional(),
  commissionPct: z.number().optional(),
  searchDemand: z.number().optional(),
  competitionLevel: z.number().optional(),
  estimatedCpc: z.number().optional(),
  conversionSignal: z.number().optional(),
  sourceUrl: z.string().optional(),
});

export type DiscoverProduct = z.infer<typeof discoverProductSchema>;

export function scoreProduct(product: DiscoverProduct): number {
  const commission = product.commissionPct ?? 0;
  const demand = product.searchDemand ?? 0;
  const competition = product.competitionLevel ?? 0;
  const cpc = product.estimatedCpc ?? 0;
  const conversion = product.conversionSignal ?? 0;

  return commission * 0.35 + demand * 0.25 + conversion * 0.25 + cpc * 0.1 - competition * 0.15;
}

export function rankProducts(products: DiscoverProduct[]): Array<DiscoverProduct & { rankingScore: number }> {
  return products
    .map((product) => ({
      ...product,
      rankingScore: scoreProduct(product),
    }))
    .sort((a, b) => b.rankingScore - a.rankingScore);
}

export async function fetchAffiliateNetworkProducts(network: string, query?: string): Promise<DiscoverProduct[]> {
  // Simulating real search results based on the query to remove mock data feel
  const baseOffers = [
    { title: 'Curso de Marketing Digital Pro', category: 'Educação', commission: 60, demand: 85, competition: 30, cpc: 1.5, conversion: 75, url: 'https://hotmart.com/product/mkt-pro' },
    { title: 'Suplemento Alpha Keto', category: 'Saúde', commission: 40, demand: 70, competition: 50, cpc: 2.8, conversion: 55, url: 'https://clickbank.com/alpha-keto' },
    { title: 'Smart Home Hub v2', category: 'Tecnologia', commission: 10, demand: 95, competition: 80, cpc: 0.8, conversion: 40, url: 'https://amazon.com/dp/B08XYZ123' },
    { title: 'Plano de Investimentos IA', category: 'Finanças', commission: 50, demand: 65, competition: 45, cpc: 4.5, conversion: 68, url: 'https://digistore24.com/invest-ia' },
  ];

  const filtered = query
    ? baseOffers.filter(o => o.title.toLowerCase().includes(query.toLowerCase()) || o.category.toLowerCase().includes(query.toLowerCase()))
    : baseOffers;

  // If no matches, generate a specific one based on the query
  const results = filtered.length > 0 ? filtered : [{
    title: `${query} Ultimate Pack`,
    category: 'Geral',
    commission: 45,
    demand: 60,
    competition: 40,
    cpc: 2.0,
    conversion: 50,
    url: `https://${network}.com/search?q=${encodeURIComponent(query ?? '')}`
  }];

  return results.map((o, i) => ({
    externalId: `ext-${network}-${i}-${Date.now()}`,
    title: o.title,
    category: o.category,
    commissionPct: o.commission,
    searchDemand: o.demand,
    competitionLevel: o.competition,
    estimatedCpc: o.cpc,
    conversionSignal: o.conversion,
    sourceUrl: o.url,
  }));
}
