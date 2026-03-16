import { z } from 'zod';

import { queueNames } from '../constants/index.js';

export const authUserSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email().optional(),
});

export const affiliateNetworkSchema = z.enum([
  'amazon',
  'clickbank',
  'hotmart',
  'digistore24',
  'cj',
  'shareasale',
]);

export const productUpsertSchema = z.object({
  network: affiliateNetworkSchema,
  externalId: z.string().min(1),
  title: z.string().min(1),
  category: z.string().optional(),
  price: z.number().nonnegative().optional(),
  currencyCode: z.string().length(3).optional(),
  commissionPct: z.number().min(0).max(100).optional(),
  popularityScore: z.number().min(0).max(100).optional(),
  salesRank: z.number().int().positive().optional(),
  reviewScore: z.number().min(0).max(5).optional(),
  sourceUrl: z.string().url().optional(),
});

export const generateLandingBodySchema = z.object({
  productId: z.string().uuid(),
  tone: z.string().default('direct-response'),
  audience: z.string().default('broad'),
});

export const campaignBuildBodySchema = z.object({
  adAccountId: z.string().uuid(),
  productId: z.string().uuid(),
  objective: z.string().default('conversions'),
  dailyBudgetMicros: z.coerce.bigint().optional(),
});

export const jobPayloadSchemas = {
  [queueNames.productDiscovery]: z.object({
    userId: z.string().uuid(),
    network: affiliateNetworkSchema.optional(),
    query: z.string().optional(),
  }),
  [queueNames.productScrape]: z.object({
    userId: z.string().uuid(),
    productId: z.string().uuid(),
    url: z.string().url(),
  }),
  [queueNames.keywordIntel]: z.object({
    userId: z.string().uuid(),
    campaignId: z.string().uuid().optional(),
    niche: z.string().optional(),
  }),
  [queueNames.landingGenerate]: z.object({
    userId: z.string().uuid(),
    productId: z.string().uuid(),
    landingPageId: z.string().uuid().optional(),
  }),
  [queueNames.campaignBuild]: z.object({
    userId: z.string().uuid(),
    adAccountId: z.string().uuid(),
    productId: z.string().uuid(),
    objective: z.string().default('conversions'),
    dailyBudgetMicros: z.coerce.bigint().optional(),
  }),
  [queueNames.campaignOptimize]: z.object({
    userId: z.string().uuid(),
    campaignId: z.string().uuid(),
  }),
  [queueNames.analyticsRollup]: z.object({
    userId: z.string().uuid(),
    adAccountId: z.string().uuid().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
  [queueNames.affiliateReconcile]: z.object({
    userId: z.string().uuid(),
    network: affiliateNetworkSchema.optional(),
  }),
} as const;

export const queueEnqueueBodySchema = z.object({
  queueName: z.enum([
    queueNames.productDiscovery,
    queueNames.productScrape,
    queueNames.keywordIntel,
    queueNames.landingGenerate,
    queueNames.campaignBuild,
    queueNames.campaignOptimize,
    queueNames.analyticsRollup,
    queueNames.affiliateReconcile,
  ]),
  payload: z.record(z.any()),
  idempotencyKey: z.string().min(8).max(120),
});

export const apiEnvelopeSchema = z.object({
  data: z.unknown().nullable(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .nullable(),
  meta: z
    .object({
      requestId: z.string().optional(),
      cursor: z.string().optional(),
      hasNextPage: z.boolean().optional(),
    })
    .optional(),
});

// ClickBank API Contracts
export const clickBankProductSchema = z.object({
  pid: z.string(),
  title: z.string(),
  category: z.string().optional(),
  price: z.coerce.number().nonnegative(),
  commission: z.coerce.number().min(0).max(100), // percentage
  gravity: z.coerce.number().nonnegative().default(0), // popularity indicator
  image: z.string().url().optional(),
});

export const clickBankSearchResponseSchema = z.object({
  products: z.array(clickBankProductSchema),
  pageNumber: z.number().int(),
  pageSize: z.number().int(),
  totalResults: z.number().int(),
});

export type ClickBankProduct = z.infer<typeof clickBankProductSchema>;
export type ClickBankSearchResponse = z.infer<typeof clickBankSearchResponseSchema>;
