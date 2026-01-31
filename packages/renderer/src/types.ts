export interface AudioTrackConfig {
  /**
   * Path to the audio file.
   */
  path: string;

  /**
   * Volume multiplier (0.0 to 1.0).
   * Defaults to 1.0.
   */
  volume?: number;

  /**
   * Time in seconds when this track should start in the composition.
   * Defaults to 0.
   */
  offset?: number;

  /**
   * Time in seconds to seek into the source file before playing.
   * Defaults to 0.
   */
  seek?: number;
}

export interface BrowserConfig {
  /**
   * Whether to run the browser in headless mode. Defaults to true.
   */
  headless?: boolean;

  /**
   * Path to a browser executable to use instead of the bundled Chromium.
   */
  executablePath?: string;

  /**
   * Additional arguments to pass to the browser instance.
   * These will be merged with the default arguments.
   */
  args?: string[];
}

export interface RendererOptions {
  /**
   * Configuration for the Playwright browser instance.
   */
  browserConfig?: BrowserConfig;

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
   * The exact number of frames to render.
   * If provided, this overrides `durationInSeconds` for calculating loop limits.
   * Useful for precise distributed rendering to avoid floating point errors.
   */
  frameCount?: number;

  /**
   * Path to an audio file to include in the output video.
   * If provided, the audio will be mixed with the video.
   */
  audioFilePath?: string;

  /**
   * List of audio tracks to include in the output video.
   * Can be a simple file path string or a configuration object.
   * If provided, these will be mixed with the video.
   */
  audioTracks?: (string | AudioTrackConfig)[];

  /**
   * Path to an SRT file to burn into the video as subtitles.
   * Note: This requires video transcoding (videoCodec cannot be 'copy').
   */
  subtitles?: string;

  /**
   * The audio codec to use.
   * Defaults to 'aac' (unless videoCodec implies WebM, then 'libvorbis').
   */
  audioCodec?: string;

  /**
   * The audio bitrate (e.g., '128k', '192k').
   * If not provided, FFmpeg defaults will be used.
   */
  audioBitrate?: string;

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
   * The image format to use for intermediate capture in 'dom' mode,
   * or as a fallback in 'canvas' mode if WebCodecs is not available.
   *
   * Defaults to 'png'.
   */
  intermediateImageFormat?: 'png' | 'jpeg';

  /**
   * The quality of the intermediate image (0-100).
   * Only applicable if `intermediateImageFormat` is 'jpeg'.
   *
   * Defaults to undefined (browser default).
   */
  intermediateImageQuality?: number;

  /**
   * Path to the FFmpeg binary.
   * Defaults to the binary provided by @ffmpeg-installer/ffmpeg.
   */
  ffmpegPath?: string;

  /**
   * Timeout in milliseconds to wait for the frame to stabilize (e.g., loading fonts, images, custom hooks).
   * Defaults to 30000ms.
   */
  stabilityTimeout?: number;

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
