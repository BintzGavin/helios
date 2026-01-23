import { Page } from 'playwright';

export interface RenderStrategy {
  /**
   * Prepares the strategy for rendering.
   * This method is called once before the capture loop begins.
   * Useful for initializing encoders, setting up event listeners, or other stateful setup.
   * @param page The Playwright page instance.
   */
  prepare(page: Page): Promise<void>;

  /**
   * Captures a single frame at the specified time.
   * @param page The Playwright page instance.
   * @param frameTime The time in milliseconds to capture.
   * @returns A Promise that resolves to a Buffer containing the image data.
   */
  capture(page: Page, frameTime: number): Promise<Buffer>;

  /**
   * Finishes the rendering process.
   * This method is called after the capture loop ends.
   * Useful for flushing encoders or cleaning up resources.
   * @param page The Playwright page instance.
   * @returns A Promise that resolves to a Buffer containing any remaining data, or void.
   */
  finish(page: Page): Promise<Buffer | void>;

  /**
   * Returns the FFmpeg input arguments for this strategy.
   * These arguments describe how the data is piped into FFmpeg.
   * @param config Configuration object containing fps.
   */
  getFFmpegInputArgs(config: { fps: number }): string[];
}
