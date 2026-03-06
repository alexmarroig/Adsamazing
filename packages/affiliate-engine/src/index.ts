import { z } from 'zod';

export const discoverProductSchema = z.object({
  title: z.string(),
  category: z.string().optional(),
  commissionPct: z.number().optional(),
  searchDemand: z.number().optional(),
  competitionLevel: z.number().optional(),
  estimatedCpc: z.number().optional(),
  conversionSignal: z.number().optional(),
});

export type DiscoverProduct = z.infer<typeof discoverProductSchema>;

export function scoreProduct(product: DiscoverProduct): number {
  const data = discoverProductSchema.parse(product);
  const commission = data.commissionPct ?? 0;
  const demand = data.searchDemand ?? 0;
  const competition = data.competitionLevel ?? 0;
  const cpc = data.estimatedCpc ?? 0;
  const conversion = data.conversionSignal ?? 0;

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
  // API-first connector placeholder. Network clients can replace this with official integrations.
  return [
    {
      title: `${network.toUpperCase()} Offer ${query ?? 'Top'}`,
      category: 'marketing',
      commissionPct: 45,
      searchDemand: 70,
      competitionLevel: 40,
      estimatedCpc: 2.4,
      conversionSignal: 62,
    },
  ];
}

