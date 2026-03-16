import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { processVideoForPinterest, selectMusicForProduct } from '@ads/video-engine';
import { generatePinterestContent } from '@ads/pinterest-engine';
import { prisma } from '@ads/db';
import type { ShopeeProduct } from '@ads/shared';
import pino from 'pino';

const execAsync = promisify(exec);
const logger = pino({ name: 'shopee-video-worker' });

interface ShopeeVideoJob {
  userId: string;
  shopeeProduct: ShopeeProduct;
  videoUrl?: string;
}

export async function processShopeeVideo(job: ShopeeVideoJob, openaiApiKey: string): Promise<any> {
  const { userId, shopeeProduct, videoUrl } = job;

  try {
    logger.info({ productId: shopeeProduct.itemId }, 'Starting video processing');

    let videoPath = '/tmp/video.mp4';
    if (videoUrl) {
      logger.debug({ url: videoUrl }, 'Downloading video');
      const { stdout } = await execAsync(`wget -O "${videoPath}" "${videoUrl}"`);
    } else {
      return { error: 'No video URL provided' };
    }

    const audioPath = '/tmp/audio.wav';
    await execAsync(`ffmpeg -i "${videoPath}" -q:a 9 -n "${audioPath}"`);

    const musicPath = await selectMusicForProduct(shopeeProduct.category);

    const outputPath = `/tmp/pinterest-${shopeeProduct.itemId}.mp4`;
    const cta = 'Clique no link da bio para comprar!';

    const editedVideoPath = await processVideoForPinterest(videoPath, {
      openaiApiKey,
      outputPath,
      cta,
      musicPath,
    });

    logger.info({ videoPath: editedVideoPath }, 'Video editing complete');

    const pinterestContent = await generatePinterestContent(shopeeProduct, editedVideoPath);

    const savedContent = await prisma.shopeeVideoContent.create({
      data: {
        userId,
        shopeeProductId: `${shopeeProduct.shopId}:${shopeeProduct.itemId}`,
        videoPath: editedVideoPath,
        pinterestMetadata: pinterestContent,
        status: 'ready_for_pinterest',
      },
    });

    logger.info({ contentId: savedContent.id }, 'Content saved and ready for Pinterest');

    return {
      success: true,
      contentId: savedContent.id,
      videoPath: editedVideoPath,
      pinterestContent: pinterestContent,
      message: 'Video ready for Pinterest review',
    };
  } catch (error) {
    logger.error({ err: error }, 'Video processing failed');
    throw error;
  }
}
