import { Page } from 'playwright';
import { TimeDriver } from './TimeDriver';

export class SeekTimeDriver implements TimeDriver {
  async prepare(page: Page): Promise<void> {
    // No-op for Seek driver
    return Promise.resolve();
  }

  async setTime(page: Page, timeInSeconds: number): Promise<void> {
    await page.evaluate((t) => {
      // Set time and wait for frame
      (document.timeline as any).currentTime = t * 1000; // Convert to ms
      return new Promise<void>(resolve => {
        requestAnimationFrame(() => resolve());
      });
    }, timeInSeconds);
  }
}
