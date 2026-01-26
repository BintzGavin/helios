import { Page } from 'playwright';
import { TimeDriver } from './TimeDriver';

export class SeekTimeDriver implements TimeDriver {
  async prepare(page: Page): Promise<void> {
    await page.addInitScript(() => {
      // Initialize virtual time
      (window as any).__HELIOS_VIRTUAL_TIME__ = 0;

      // Capture initial wall clock to anchor Date.now()
      const initialDate = Date.now();

      // Override performance.now()
      // We don't need to keep the original because we want full control
      window.performance.now = () => (window as any).__HELIOS_VIRTUAL_TIME__;

      // Override Date.now()
      window.Date.now = () => initialDate + (window as any).__HELIOS_VIRTUAL_TIME__;

      // Override requestAnimationFrame
      const originalRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = (callback) => {
        return originalRAF((_timestamp) => {
          // Pass virtual time to the callback instead of the real timestamp
          callback((window as any).__HELIOS_VIRTUAL_TIME__);
        });
      };
    });
  }

  async setTime(page: Page, timeInSeconds: number): Promise<void> {
    await page.evaluate((t) => {
      const timeInMs = t * 1000;

      // Update the global virtual time
      (window as any).__HELIOS_VIRTUAL_TIME__ = timeInMs;

      // Synchronize document timeline (WAAPI)
      if (document.timeline) {
        (document.timeline as any).currentTime = timeInMs;
      }

      // Wait for a frame to ensure the new time is propagated
      return new Promise<void>(resolve => {
        requestAnimationFrame(() => resolve());
      });
    }, timeInSeconds);
  }
}
