import fs from 'node:fs';
import path from 'node:path';
import { OpenAI } from 'openai';

export interface TranscriberConfig {
  openaiApiKey: string;
}

export interface Subtitle {
  startTime: number; // milliseconds
  endTime: number;
  text: string;
}

/**
 * Transcribe video to text using OpenAI Whisper
 * Generates subtitle format (SRT/VTT compatible)
 */
export class VideoTranscriber {
  private openai: OpenAI;

  constructor(config: TranscriberConfig) {
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });
  }

  /**
   * Extract audio from video file (requires ffmpeg)
   * For now, assume audio file is provided or extracted separately
   */
  async transcribeVideo(audioPath: string): Promise<Subtitle[]> {
    try {
      // Read audio file
      const audioBuffer = fs.readFileSync(audioPath);

      // Call Whisper API
      const transcript = await this.openai.audio.transcriptions.create({
        file: new File([audioBuffer], path.basename(audioPath), { type: 'audio/wav' }),
        model: 'whisper-1',
        language: 'pt', // Portuguese
        timestamp_granularities: ['segment'],
      });

      // Parse timestamps and convert to subtitle format
      // Whisper returns: { text: string, segments: [{id, seek, start, end, text}] }
      const subtitles: Subtitle[] = transcript.segments?.map((segment: any) => ({
        startTime: Math.floor(segment.start * 1000),
        endTime: Math.floor(segment.end * 1000),
        text: segment.text.trim(),
      })) || [];

      return subtitles;
    } catch (error) {
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  /**
   * Convert subtitles to SRT format for FFmpeg
   */
  subtitlesToSRT(subtitles: Subtitle[]): string {
    return subtitles
      .map(
        (sub, index) =>
          `${index + 1}\n${this.formatTime(sub.startTime)} --> ${this.formatTime(sub.endTime)}\n${sub.text}\n`
      )
      .join('\n');
  }

  private formatTime(ms: number): string {
    const hours = Math.floor(ms / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    const seconds = Math.floor((ms % 60_000) / 1000);
    const milliseconds = ms % 1000;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
  }
}

export async function transcribeVideo(audioPath: string, apiKey: string): Promise<Subtitle[]> {
  const transcriber = new VideoTranscriber({ openaiApiKey: apiKey });
  return transcriber.transcribeVideo(audioPath);
}
