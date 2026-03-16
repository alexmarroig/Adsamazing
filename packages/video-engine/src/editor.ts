import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface VideoEditConfig {
  inputPath: string;
  outputPath: string;
  subtitles?: {
    text: string;
    startTime: number; // in seconds
    endTime: number; // in seconds
    fontSize?: number;
    color?: string;
  }[];
  cta?: {
    text: string;
    startTime: number;
    duration: number; // in seconds
    position?: 'bottom' | 'top' | 'center';
  };
  backgroundMusic?: {
    audioPath: string;
    volume?: number; // 0-1
    fadeIn?: number; // in seconds
    fadeOut?: number; // in seconds
  };
}

/**
 * VideoEditor handles video editing with FFmpeg, adding subtitles, CTAs, and background music
 */
export class VideoEditor {
  /**
   * Edit a video with subtitles, CTA overlay, and background music
   * @param config VideoEditConfig with input/output paths and edit specifications
   * @returns Path to the edited video file
   */
  async editVideo(config: VideoEditConfig): Promise<string> {
    // Validate input file exists
    if (!fs.existsSync(config.inputPath)) {
      throw new Error(`Input video file not found: ${config.inputPath}`);
    }

    try {
      // Create output directory if it doesn't exist
      const outputDir = path.dirname(config.outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Build FFmpeg filter chain
      const filters = this.buildFilterChain(config);

      // Construct FFmpeg command
      let command = `ffmpeg -i "${config.inputPath}"`;

      // Add audio input if background music is provided
      if (config.backgroundMusic) {
        command += ` -i "${config.backgroundMusic.audioPath}"`;
      }

      // Add filter chain
      if (filters.length > 0) {
        command += ` -filter_complex "${filters.join(',')}"`;
      }

      // Audio handling: mix original audio with background music
      if (config.backgroundMusic) {
        const volume = config.backgroundMusic.volume || 0.3;
        command += ` -filter_complex "[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2[a]" -map "[a]"`;
      }

      // Output options
      command += ` -codec:v libx264 -crf 28 -codec:a aac -b:a 128k`;
      command += ` -y "${config.outputPath}"`;

      // Execute FFmpeg command
      execSync(command, { stdio: 'inherit' });

      return config.outputPath;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Video editing failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Build FFmpeg filter chain from configuration
   * @param config VideoEditConfig
   * @returns Array of filter strings
   */
  private buildFilterChain(config: VideoEditConfig): string[] {
    const filters: string[] = [];

    // Add subtitle overlays
    if (config.subtitles && config.subtitles.length > 0) {
      for (let i = 0; i < config.subtitles.length; i++) {
        const subtitle = config.subtitles[i];
        const fontSize = subtitle.fontSize || 24;
        const color = subtitle.color || 'white';

        const subtitleFilter = `drawtext=text='${subtitle.text}':fontsize=${fontSize}:fontcolor=${color}:x=(w-text_w)/2:y=h-50:enable='between(t,${subtitle.startTime},${subtitle.endTime})'`;

        filters.push(subtitleFilter);
      }
    }

    // Add CTA overlay
    if (config.cta) {
      const ctaPosition = config.cta.position || 'bottom';
      let yPosition = 'h-50'; // default bottom

      if (ctaPosition === 'top') {
        yPosition = '20';
      } else if (ctaPosition === 'center') {
        yPosition = '(h-text_h)/2';
      }

      const ctaFilter = `drawtext=text='${config.cta.text}':fontsize=28:fontcolor=white:x=(w-text_w)/2:y=${yPosition}:enable='between(t,${config.cta.startTime},${config.cta.startTime + config.cta.duration})'`;

      filters.push(ctaFilter);
    }

    // Add background music fading if applicable
    if (config.backgroundMusic) {
      const fadeIn = config.backgroundMusic.fadeIn || 0;
      const fadeOut = config.backgroundMusic.fadeOut || 0;

      if (fadeIn > 0) {
        filters.push(`afade=t=in:st=0:d=${fadeIn}`);
      }

      if (fadeOut > 0) {
        filters.push(`afade=t=out:st=0:d=${fadeOut}`);
      }
    }

    return filters;
  }
}

export default VideoEditor;
