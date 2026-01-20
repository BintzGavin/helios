import { Page } from 'playwright';

export interface RenderStrategy {
  /**
   * Captures a single frame at the specified time.
   * @param page The Playwright page instance.
   * @param frameTime The time in milliseconds to capture.
   * @returns A Promise that resolves to a Buffer containing the image data.
   */
  capture(page: Page, frameTime: number): Promise<Buffer>;
}
