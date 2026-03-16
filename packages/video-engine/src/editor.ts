import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export interface VideoEditorConfig {
  inputVideoPath: string;
  outputPath: string;
  subtitles: Array<{ startTime: number; endTime: number; text: string }>;
  cta: string; // Call-to-action text (e.g., "Clique no link da bio!")
  musicPath?: string; // Path to background music file
  logoPath?: string; // Optional watermark/logo
}

/**
 * Edit video with subtitles, CTA overlay, and background music
 * Uses FFmpeg for processing
 */
export class VideoEditor {
  private config: VideoEditorConfig;

  constructor(config: VideoEditorConfig) {
    this.config = config;
  }

  /**
   * Generate subtitles filter string for FFmpeg
   * Format: subtitles='subtitle_file.srt':force_style='FontSize=24,FontName=Arial'
   */
  private generateSubtitleFilter(): string {
    const subtitleFile = '/tmp/subtitles.srt';
    const srtContent = this.generateSRT();
    fs.writeFileSync(subtitleFile, srtContent);

    return `subtitles='${subtitleFile}':force_style='FontSize=24,FontName=Arial,PrimaryColour=&HFFFFFF&,BorderStyle=3,Outline=2,Shadow=1'`;
  }

  /**
   * Generate SRT subtitle file
   */
  private generateSRT(): string {
    return this.config.subtitles
      .map(
        (sub, index) =>
          `${index + 1}\n${this.msToTimecode(sub.startTime)} --> ${this.msToTimecode(sub.endTime)}\n${sub.text}\n`
      )
      .join('\n');
  }

  private msToTimecode(ms: number): string {
    const hours = Math.floor(ms / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    const seconds = Math.floor((ms % 60_000) / 1000);
    const millis = ms % 1000;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
  }

  /**
   * Generate CTA text overlay filter for FFmpeg
   * Place text at bottom of video: "Clique no link da bio!" with semi-transparent background
   */
  private generateCTAFilter(): string {
    return `drawtext=text='${this.config.cta}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=32:fontcolor=white:boxcolor=black@0.5:boxborderw=5:x='(w-text_w)/2':y='h-text_h-20'`;
  }

  /**
   * Edit video with all effects: subtitles + CTA + music
   * Output format: MP4 optimized for Pinterest (1080x1080 or 1080x1350)
   */
  async editVideo(): Promise<string> {
    try {
      const subtitleFilter = this.generateSubtitleFilter();
      const ctaFilter = this.generateCTAFilter();

      // Build FFmpeg command
      let ffmpegCmd = `ffmpeg -i "${this.config.inputVideoPath}"`;

      // Video filters chain: subtitles + CTA
      ffmpegCmd += ` -vf "[0:v]${subtitleFilter},${ctaFilter}[v]"`;

      // Audio: mix video audio with background music if provided
      if (this.config.musicPath && fs.existsSync(this.config.musicPath)) {
        ffmpegCmd += ` -i "${this.config.musicPath}"`;
        // Filter_complex to mix original audio with music (music at lower volume)
        ffmpegCmd += ` -filter_complex "[0:a]volume=0.8[a0];[1:a]volume=0.3[a1];[a0][a1]amix=inputs=2:duration=first[a]"`;
        ffmpegCmd += ` -map "[v]" -map "[a]"`;
      } else {
        ffmpegCmd += ` -map "[v]" -map 0:a`;
      }

      // Output settings: MP4, H.264, optimized for Pinterest
      ffmpegCmd += ` -c:v libx264 -preset fast -crf 22`;
      ffmpegCmd += ` -c:a aac -b:a 128k`;
      ffmpegCmd += ` -pix_fmt yuv420p`; // Ensure compatibility
      ffmpegCmd += ` -y "${this.config.outputPath}"`;

      // Execute FFmpeg
      execSync(ffmpegCmd, { stdio: 'inherit' });

      if (!fs.existsSync(this.config.outputPath)) {
        throw new Error('Video editing failed - output file not created');
      }

      return this.config.outputPath;
    } catch (error) {
      throw new Error(`Video editing failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }
}

export async function editVideo(config: VideoEditorConfig): Promise<string> {
  const editor = new VideoEditor(config);
  return editor.editVideo();
}
