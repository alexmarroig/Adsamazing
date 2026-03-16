export { VideoTranscriber, transcribeVideo } from './transcriber.js';
export type { TranscriberConfig, Subtitle } from './transcriber.js';

export { VideoEditor, editVideo } from './editor.js';
export type { VideoEditorConfig } from './editor.js';

export { MusicManager, selectMusicForProduct } from './music-manager.js';
export type { AnimatedMusic } from './music-manager.js';

/**
 * Complete video pipeline: download → transcribe → edit
 */
export async function processVideoForPinterest(
  videoPath: string,
  options: {
    openaiApiKey: string;
    outputPath: string;
    cta: string;
    musicPath?: string;
  }
): Promise<string> {
  const { VideoTranscriber } = await import('./transcriber.js');
  const { VideoEditor } = await import('./editor.js');

  // Step 1: Transcribe
  const transcriber = new VideoTranscriber({ openaiApiKey: options.openaiApiKey });
  const subtitles = await transcriber.transcribeVideo(videoPath);

  // Step 2: Edit with subtitles + CTA + music
  const editor = new VideoEditor({
    inputVideoPath: videoPath,
    outputPath: options.outputPath,
    subtitles,
    cta: options.cta,
    musicPath: options.musicPath,
  });
  const editedPath = await editor.editVideo();

  return editedPath;
}
