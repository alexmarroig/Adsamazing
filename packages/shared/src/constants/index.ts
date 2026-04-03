import { z } from 'zod';

export const queueNames = {
  productDiscovery: 'product_discovery',
  productScrape: 'product_scrape',
  keywordIntel: 'keyword_intel',
  landingGenerate: 'landing_generate',
  campaignBuild: 'campaign_build',
  campaignPublish: 'campaign_publish',
  campaignOptimize: 'campaign_optimize',
  analyticsRollup: 'analytics_rollup',
  affiliateReconcile: 'affiliate_reconcile',
} as const;

export type QueueName = (typeof queueNames)[keyof typeof queueNames];

export const envModeSchema = z.enum(['development', 'test', 'production']);

export const paginatedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const utmSchema = z.object({
  source: z.string().optional(),
  medium: z.string().optional(),
  campaign: z.string().optional(),
  term: z.string().optional(),
  content: z.string().optional(),
});
