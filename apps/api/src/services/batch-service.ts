import { ShopeeClient } from '@ads/shopee-engine';
import type { ShopeeProduct } from '@ads/shared';

export interface BatchDiscoveryOptions {
  limit?: number; // default 50
  minCommission?: number; // default 15
  minRating?: number; // default 4.0
}

export interface BatchJob {
  batchId: string;
  userId: string;
  totalProducts: number;
  processedCount: number;
  failedCount: number;
  status: 'discovered' | 'processing' | 'completed' | 'failed';
  products: ShopeeProduct[];
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Service for batch product discovery and processing
 */
export class BatchService {
  constructor(private shopeeClient: ShopeeClient) {}

  /**
   * Discover top products matching criteria
   * Returns array of products ready for video processing
   */
  async discoverProductBatch(
    options: BatchDiscoveryOptions = {}
  ): Promise<ShopeeProduct[]> {
    const {
      limit = 50,
      minCommission = 15,
      minRating = 4.0,
    } = options;

    const products: ShopeeProduct[] = [];
    let page = 1;
    const maxPages = 5; // Search up to 5 pages to find 50 quality products

    while (products.length < limit && page <= maxPages) {
      try {
        const pageProducts = await this.shopeeClient.searchTechProducts(
          'technology',
          page
        );

        // Filter additional criteria if needed
        const filtered = pageProducts.filter(
          (p) =>
            p.commission >= minCommission &&
            p.rating >= minRating &&
            p.videoUrls &&
            p.videoUrls.length > 0 // Only include if has video
        );

        products.push(...filtered);
        page++;
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error);
        break;
      }

      // Stop if we have enough products
      if (products.length >= limit) break;
    }

    // Return exactly `limit` products, sorted by commission (highest first)
    return products
      .slice(0, limit)
      .sort((a, b) => b.commission - a.commission);
  }

  /**
   * Generate unique batch ID
   */
  generateBatchId(): string {
    return `batch-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

export async function initBatchService(
  shopeeClient: ShopeeClient
): Promise<BatchService> {
  return new BatchService(shopeeClient);
}
