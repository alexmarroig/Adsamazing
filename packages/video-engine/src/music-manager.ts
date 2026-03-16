import * as fs from 'fs';
import * as path from 'path';

interface MusicTrack {
  id: string;
  name: string;
  filePath: string;
  duration: number; // in seconds
  genre: string;
  mood: 'energetic' | 'calm' | 'uplifting' | 'mysterious';
  tempo: number; // BPM
}

/**
 * MusicManager handles music selection and management for video backgrounds
 */
export class MusicManager {
  private musicLibrary: Map<string, MusicTrack> = new Map();
  private musicDirectory: string;

  constructor(musicDirectory: string) {
    this.musicDirectory = musicDirectory;
    this.loadMusicLibrary();
  }

  /**
   * Load music library from directory
   */
  private loadMusicLibrary(): void {
    if (!fs.existsSync(this.musicDirectory)) {
      console.warn(`Music directory not found: ${this.musicDirectory}`);
      return;
    }

    const files = fs.readdirSync(this.musicDirectory);

    for (const file of files) {
      if (['.mp3', '.wav', '.aac', '.flac'].includes(path.extname(file).toLowerCase())) {
        const trackId = path.basename(file, path.extname(file));
        const metadata = this.parseTrackMetadata(trackId);

        const track: MusicTrack = {
          id: trackId,
          name: metadata.name,
          filePath: path.join(this.musicDirectory, file),
          duration: metadata.duration || 60,
          genre: metadata.genre || 'general',
          mood: metadata.mood || 'calm',
          tempo: metadata.tempo || 120,
        };

        this.musicLibrary.set(trackId, track);
      }
    }
  }

  /**
   * Parse track metadata from filename or metadata file
   */
  private parseTrackMetadata(trackId: string): Partial<MusicTrack> {
    const metadataPath = path.join(this.musicDirectory, `${trackId}.json`);

    if (fs.existsSync(metadataPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        return metadata;
      } catch (error) {
        console.warn(`Failed to parse metadata for ${trackId}:`, error);
      }
    }

    // Fallback: parse from filename (e.g., "uplifting-120bpm-calm.mp3")
    const parts = trackId.split('-');
    return {
      name: trackId,
      mood: (parts[0] as any) || 'calm',
      tempo: parseInt(parts[1]) || 120,
    };
  }

  /**
   * Get all available music tracks
   */
  getAllTracks(): MusicTrack[] {
    return Array.from(this.musicLibrary.values());
  }

  /**
   * Get a random track matching criteria
   */
  getRandomTrack(criteria?: { mood?: string; genre?: string; maxDuration?: number }): MusicTrack | null {
    let tracks = this.getAllTracks();

    if (criteria?.mood) {
      tracks = tracks.filter((t) => t.mood === criteria.mood);
    }

    if (criteria?.genre) {
      tracks = tracks.filter((t) => t.genre === criteria.genre);
    }

    if (criteria?.maxDuration) {
      tracks = tracks.filter((t) => t.duration <= criteria.maxDuration);
    }

    if (tracks.length === 0) {
      return null;
    }

    return tracks[Math.floor(Math.random() * tracks.length)];
  }

  /**
   * Get a specific track by ID
   */
  getTrack(trackId: string): MusicTrack | null {
    return this.musicLibrary.get(trackId) || null;
  }

  /**
   * Find tracks matching search criteria
   */
  searchTracks(query: string): MusicTrack[] {
    const lowerQuery = query.toLowerCase();

    return Array.from(this.musicLibrary.values()).filter((track) => {
      return (
        track.name.toLowerCase().includes(lowerQuery) ||
        track.genre.toLowerCase().includes(lowerQuery) ||
        track.mood.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * Add a music track to the library
   */
  addTrack(track: MusicTrack): void {
    this.musicLibrary.set(track.id, track);
  }

  /**
   * Remove a track from the library
   */
  removeTrack(trackId: string): boolean {
    return this.musicLibrary.delete(trackId);
  }
}

export default MusicManager;
