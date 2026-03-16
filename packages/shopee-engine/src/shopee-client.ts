import crypto from 'node:crypto';

export interface ShopeeClientConfig {
  appId: string;
  secretKey: string;
  affiliateId: string;
  baseUrl?: string;
}

export interface ShopeeProduct {
  shopId: string;
  itemId: string;
  name: string;
  price: number;
  commission: number; // percentage
  sales: number; // monthly sales
  rating: number;
  videoUrls?: string[]; // vendor video URLs
  category: string;
  shopName: string;
  shopeeLink: string;
  affiliateLink: string;
}

/**
 * Shopee GraphQL API Client
 * Handles authentication and product search
 */
export class ShopeeClient {
  private config: ShopeeClientConfig;
  private baseUrl: string;

  constructor(config: ShopeeClientConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://partner.shopeemobile.com/api/v2';
  }

  /**
   * Generate SHA256 signature for Shopee API
   * Format: SHA256(AppID + "&" + SecretKey + "&" + Timestamp)
   */
  private generateSignature(timestamp: number): string {
    const message = `${this.config.appId}&${this.config.secretKey}&${timestamp}`;
    return crypto.createHash('sha256').update(message).digest('hex');
  }

  /**
   * Make authenticated request to Shopee API
   */
  private async request(endpoint: string): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateSignature(timestamp);

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `SHA256 Credential=${this.config.appId}, Timestamp=${timestamp}, Signature=${signature}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Shopee API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Search for technology products with filters
   * Focus on: commission ≥ 15%, healthy sales, good ratings
   */
  async searchTechProducts(query: string = 'technology', page: number = 1): Promise<ShopeeProduct[]> {
    try {
      const data = await this.request('/product/search', {
        keyword: query,
        category: 'electronics,technology',
        sort_type: 'sales_desc',
        page,
        page_size: 50,
      });

      // Filter and map products
      return data.items
        ?.filter((item: any) => {
          const commission = item.commission_rate || 0;
          const sales = item.monthly_sales || 0;
          const rating = item.rating_star || 0;

          // Minimum thresholds:
          // - Commission ≥ 15%
          // - Monthly sales ≥ 50
          // - Rating ≥ 4.0
          return commission >= 15 && sales >= 50 && rating >= 4.0;
        })
        .map((item: any) => ({
          shopId: item.shop_id,
          itemId: item.item_id,
          name: item.name,
          price: item.price / 100_000, // Shopee uses microcurrency
          commission: item.commission_rate,
          sales: item.monthly_sales,
          rating: item.rating_star,
          videoUrls: item.video?.video_url ? [item.video.video_url] : [],
          category: item.category_name,
          shopName: item.shop_name,
          shopeeLink: `https://shopee.com.br/${item.shop_name}/${item.name}-i.${item.shop_id}.${item.item_id}`,
          affiliateLink: `https://shopee.com.br/${item.shop_name}/${item.name}-i.${item.shop_id}.${item.item_id}?aff_id=${this.config.affiliateId}`,
        })) || [];
    } catch (error) {
      throw new Error(`Failed to search products: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  /**
   * Get product details including vendor videos
   */
  async getProductDetails(shopId: string, itemId: string): Promise<ShopeeProduct> {
    try {
      const data = await this.request(`/product/${shopId}/${itemId}`);

      return {
        shopId,
        itemId,
        name: data.name,
        price: data.price / 100_000,
        commission: data.commission_rate,
        sales: data.monthly_sales,
        rating: data.rating_star,
        videoUrls: data.video_list?.map((v: any) => v.video_url) || [],
        category: data.category_name,
        shopName: data.shop_name,
        shopeeLink: data.shopee_url,
        affiliateLink: `${data.shopee_url}?aff_id=${this.config.affiliateId}`,
      };
    } catch (error) {
      throw new Error(`Failed to get product details: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }
}

export async function initShopeeClient(config: ShopeeClientConfig): Promise<ShopeeClient> {
  return new ShopeeClient(config);
}
