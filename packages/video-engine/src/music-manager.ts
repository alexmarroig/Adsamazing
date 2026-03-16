import fs from 'node:fs';
import path from 'node:path';

export interface AnimatedMusic {
  name: string;
  path: string;
  duration: number; // seconds
  genre: 'upbeat' | 'electronic' | 'ambient';
  tempo: number; // BPM
}

/**
 * Manage animated background music for video content
 * Stores local music files or fetches from royalty-free APIs
 */
export class MusicManager {
  private musicLibrary: AnimatedMusic[] = [
    {
      name: 'upbeat-tech-1',
      path: '/assets/music/upbeat-tech-1.mp3',
      duration: 30,
      genre: 'upbeat',
      tempo: 128,
    },
    {
      name: 'electronic-energetic',
      path: '/assets/music/electronic-energetic.mp3',
      duration: 30,
      genre: 'electronic',
      tempo: 140,
    },
    {
      name: 'ambient-futuristic',
      path: '/assets/music/ambient-futuristic.mp3',
      duration: 30,
      genre: 'ambient',
      tempo: 90,
    },
  ];

  /**
   * Get appropriate music for video genre
   * For tech products, prefer upbeat/electronic
   */
  getMusic(genre: 'upbeat' | 'electronic' = 'electronic'): AnimatedMusic {
    const matches = this.musicLibrary.filter((m) => m.genre === genre);
    if (matches.length === 0) {
      return this.musicLibrary[0]; // Fallback
    }
    // Return random from matches
    return matches[Math.floor(Math.random() * matches.length)];
  }

  /**
   * List all available music
   */
  listMusic(): AnimatedMusic[] {
    return this.musicLibrary;
  }

  /**
   * Validate music file exists
   */
  validateMusicPath(musicPath: string): boolean {
    return fs.existsSync(musicPath);
  }
}

export async function selectMusicForProduct(productCategory: string): Promise<string> {
  const manager = new MusicManager();
  const music = manager.getMusic('electronic'); // Default for tech products
  return music.path;
}
