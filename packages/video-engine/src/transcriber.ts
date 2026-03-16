import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
}

/**
 * VideoTranscriber handles video transcription using OpenAI's Whisper API
 */
export class VideoTranscriber {
  private openai: OpenAI;

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Transcribe a video file
   * @param videoPath Path to the video file
   * @returns TranscriptionResult containing the transcription text and metadata
   */
  async transcribe(videoPath: string): Promise<TranscriptionResult> {
    // Validate file exists
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const fileStats = fs.statSync(videoPath);
    if (fileStats.size === 0) {
      throw new Error(`Video file is empty: ${videoPath}`);
    }

    // OpenAI has a 25MB limit for direct uploads
    const maxSize = 25 * 1024 * 1024;
    if (fileStats.size > maxSize) {
      throw new Error(
        `Video file is too large (${(fileStats.size / (1024 * 1024)).toFixed(2)}MB). Maximum is 25MB.`
      );
    }

    try {
      // Create readable stream from file
      const audioStream = fs.createReadStream(videoPath);

      // Call Whisper API with the video file
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioStream as any,
        model: 'whisper-1',
        language: 'en', // Default to English
        response_format: 'verbose_json',
      });

      return {
        text: transcription.text,
        language: transcription.language || 'en',
        duration: transcription.duration || 0,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Transcription failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Transcribe multiple video files
   * @param videoPaths Array of paths to video files
   * @returns Array of TranscriptionResult objects
   */
  async transcribeBatch(videoPaths: string[]): Promise<TranscriptionResult[]> {
    const results: TranscriptionResult[] = [];

    for (const videoPath of videoPaths) {
      try {
        const result = await this.transcribe(videoPath);
        results.push(result);
      } catch (error) {
        console.error(`Failed to transcribe ${videoPath}:`, error);
        // Continue with next file instead of failing entirely
      }
    }

    return results;
  }
}

export default VideoTranscriber;
