import type { ShopeeProduct } from '@ads/shared';

export interface PinterestContent {
  title: string;
  description: string;
  hashtags: string[];
  pin_url: string;
  image_path: string;
  video_path: string;
  cta_button: string;
  affiliate_link: string;
}

/**
 * Generate Pinterest-optimized content metadata
 * Prepares content ready for user review before posting
 */
export class PinterestContentGenerator {
  /**
   * Generate Pinterest pin title and description
   */
  generateContent(product: ShopeeProduct, videoPath: string): PinterestContent {
    const sanitizedName = product.name.replace(/[^a-z0-9 ]/gi, '').substring(0, 100);

    return {
      title: `${sanitizedName} | Melhor Preço + Frete Rápido 🚀`,
      description: `
🔥 ${product.name}
💰 R$ ${product.price.toFixed(2)}
⭐ ${product.rating}/5 (${product.sales} vendas/mês)
📦 Shopee
✅ Comissão: ${product.commission}%

Clique no link da bio para comprar!
Melhor tecnologia, melhor preço. Entrega rápida!

#Tecnologia #Shopee #Promoção #Oferta #${product.category}
`.trim(),
      hashtags: [
        '#Tecnologia',
        `#${product.category}`,
        '#Shopee',
        '#Promoção',
        '#Oferta',
        '#MelhorPreço',
        '#AfilidoShopee',
        `#${sanitizedName.split(' ')[0]}`,
      ],
      pin_url: product.affiliateLink,
      image_path: `/tmp/pinterest-thumbnail-${product.itemId}.png`,
      video_path: videoPath,
      cta_button: '🛒 Comprar Agora',
      affiliate_link: product.affiliateLink,
    };
  }

  /**
   * Format content for user review
   */
  formatForReview(content: PinterestContent): Record<string, any> {
    return {
      title: content.title,
      description: content.description,
      hashtags: content.hashtags.join(' '),
      cta: content.cta_button,
      affiliate_link: content.affiliate_link,
      files: {
        video: content.video_path,
        thumbnail: content.image_path,
      },
      ready_for_pinterest: true,
      user_action_required: 'REVIEW_AND_APPROVE',
    };
  }
}

export async function generatePinterestContent(
  product: ShopeeProduct,
  videoPath: string
): Promise<PinterestContent> {
  const generator = new PinterestContentGenerator();
  return generator.generateContent(product, videoPath);
}
