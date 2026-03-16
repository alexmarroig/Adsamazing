/**
 * Video Engine Module
 * Provides complete video processing pipeline:
 * - Transcription via OpenAI Whisper
 * - Video editing with FFmpeg (subtitles, CTAs, music)
 * - Music management for background tracks
 */

export { VideoTranscriber } from './transcriber.js';
export type { TranscriptionResult } from './transcriber.js';

export { VideoEditor } from './editor.js';
export type { VideoEditConfig } from './editor.js';

export { MusicManager } from './music-manager.js';
export type { MusicTrack } from './music-manager.js';

/**
 * VideoProcessor orchestrates the complete video pipeline
 */
export class VideoProcessor {
  constructor(
    private transcriber: any,
    private editor: any,
    private musicManager: any
  ) {}

  /**
   * Process a video end-to-end: transcribe, edit, and add music
   */
  async processVideo(videoPath: string, outputPath: string): Promise<string> {
    // Step 1: Transcribe
    const transcription = await this.transcriber.transcribe(videoPath);

    // Step 2: Select background music
    const musicTrack = this.musicManager.getRandomTrack({
      mood: 'uplifting',
      maxDuration: 120,
    });

    // Step 3: Edit video with transcription and music
    if (musicTrack) {
      const editedVideo = await this.editor.editVideo({
        inputPath: videoPath,
        outputPath,
        subtitles: [
          {
            text: transcription.text,
            startTime: 0,
            endTime: transcription.duration,
            fontSize: 24,
            color: 'white',
          },
        ],
        backgroundMusic: {
          audioPath: musicTrack.filePath,
          volume: 0.3,
          fadeIn: 1,
          fadeOut: 1,
        },
      });

      return editedVideo;
    }

    // Fallback: edit without music
    return await this.editor.editVideo({
      inputPath: videoPath,
      outputPath,
    });
  }
}

export default VideoProcessor;
