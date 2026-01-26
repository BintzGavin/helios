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

  /**
   * List of paths to audio files to include in the output video.
   * If provided, these will be mixed with the video.
   */
  audioTracks?: string[];

  /**
   * The video codec to use. Defaults to 'libx264'.
   */
  videoCodec?: string;

  /**
   * The pixel format to use. Defaults to 'yuv420p'.
   */
  pixelFormat?: string;

  /**
   * The Constant Rate Factor (CRF) for quality control.
   * Lower values mean better quality. Range varies by codec.
   */
  crf?: number;

  /**
   * The encoding preset. Defaults to 'fast' (if supported by codec).
   */
  preset?: string;

  /**
   * The video bitrate (e.g., '5M', '1000k').
   * If provided, overrides CRF for some codecs.
   */
  videoBitrate?: string;

  /**
   * The codec to use for intermediate capture in 'canvas' mode.
   * - 'vp8' (default): Widely supported, good performance.
   * - 'vp9': Better compression, higher quality.
   * - 'av1': Best compression, requires newer hardware/browsers.
   *
   * Can also be a specific codec string (e.g., 'av01.0.05M.08').
   */
  intermediateVideoCodec?: string;

  /**
   * Path to the FFmpeg binary.
   * Defaults to the binary provided by @ffmpeg-installer/ffmpeg.
   */
  ffmpegPath?: string;

  /**
   * Optional props to inject into the composition.
   * These will be available as `window.__HELIOS_PROPS__`.
   */
  inputProps?: Record<string, any>;
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
