export interface RendererOptions {
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
  /**
   * The rendering mode to use.
   * - 'canvas': Captures frames by converting the first <canvas> element to a data URL. Best for canvas-based animations.
   * - 'dom': Captures frames by taking a screenshot of the entire viewport. Best for CSS/DOM-based animations.
   *
   * Defaults to 'canvas'.
   */
  mode?: 'canvas' | 'dom';

  /**
   * The frame to start rendering from. Defaults to 0.
   * Useful for rendering a range of frames (distributed rendering).
   */
  startFrame?: number;

  /**
   * Path to an audio file to include in the output video.
   * If provided, the audio will be mixed with the video.
   */
  audioFilePath?: string;
}

export interface RenderJobOptions {
  /**
   * Callback for progress updates.
   * @param progress A number between 0 and 1.
   */
  onProgress?: (progress: number) => void;

  /**
   * An AbortSignal to cancel the rendering process.
   */
  signal?: AbortSignal;

  /**
   * Path to save the Playwright trace file (zip).
   * If provided, Playwright tracing will be enabled for the session.
   */
  tracePath?: string;
}
