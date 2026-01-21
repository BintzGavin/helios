import { Page } from 'playwright';

export interface RenderStrategy {
  /**
   * Captures a single frame at the specified time.
   * @param page The Playwright page instance.
   * @param frameTime The time in milliseconds to capture.
   * @returns A Promise that resolves to a Buffer containing the image data.
   */
  capture(page: Page, frameTime: number): Promise<Buffer>;

  /**
   * Returns the FFmpeg input arguments for this strategy.
   * These arguments describe how the data is piped into FFmpeg.
   * @param config Configuration object containing fps.
   */
  getFFmpegInputArgs(config: { fps: number }): string[];
}
