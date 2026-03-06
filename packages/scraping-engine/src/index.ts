import { chromium } from 'playwright';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
];

export type ScrapedProduct = {
  title?: string;
  price?: string;
  description?: string;
  images: string[];
  reviews?: string;
  salesIndicators?: string;
};

function chooseUserAgent(seed: string): string {
  const index = Math.abs(seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % USER_AGENTS.length;
  return USER_AGENTS[index]!;
}

export async function scrapeProductPage(url: string): Promise<ScrapedProduct> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: chooseUserAgent(url),
  });

  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    const data = await page.evaluate(() => {
      const text = (selector: string) => document.querySelector(selector)?.textContent?.trim();
      const images = Array.from(document.querySelectorAll('img')).slice(0, 8).map((img) => img.getAttribute('src')).filter(Boolean) as string[];

      return {
        title: text('h1') || text('[itemprop="name"]'),
        price: text('[itemprop="price"]') || text('.price') || text('[data-price]'),
        description: text('[itemprop="description"]') || text('meta[name="description"]'),
        images,
        reviews: text('[itemprop="ratingValue"]') || text('.rating'),
        salesIndicators: text('.sales') || text('.bought') || undefined,
      };
    });

    return {
      title: data.title,
      price: data.price,
      description: data.description,
      images: data.images,
      reviews: data.reviews,
      salesIndicators: data.salesIndicators,
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

