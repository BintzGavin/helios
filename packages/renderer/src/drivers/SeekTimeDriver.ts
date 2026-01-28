import { Page } from 'playwright';
import { TimeDriver } from './TimeDriver.js';

export class SeekTimeDriver implements TimeDriver {
  async init(page: Page): Promise<void> {
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

  async prepare(page: Page): Promise<void> {
    // No-op for SeekTimeDriver, but required by interface
  }

  async setTime(page: Page, timeInSeconds: number): Promise<void> {
    await page.evaluate(async (t) => {
      const timeInMs = t * 1000;

      // Update the global virtual time
      (window as any).__HELIOS_VIRTUAL_TIME__ = timeInMs;

      // Synchronize document timeline (WAAPI)
      if (document.timeline) {
        (document.timeline as any).currentTime = timeInMs;
      }

      const promises: Promise<any>[] = [];

      // 1. Wait for Fonts
      if (document.fonts && document.fonts.ready) {
        promises.push(document.fonts.ready);
      }

      // 2. Synchronize media elements (video, audio)
      const mediaElements = document.querySelectorAll('video, audio');
      mediaElements.forEach((el) => {
        const mediaEl = el as HTMLMediaElement;
        mediaEl.pause();
        mediaEl.currentTime = t;

        // Check if we need to wait for seeking to complete
        // readyState < 2 (HAVE_CURRENT_DATA) means we don't have the frame yet
        if (mediaEl.seeking || mediaEl.readyState < 2) {
          const p = new Promise<void>((resolve) => {
            let resolved = false;
            const finish = () => {
              if (resolved) return;
              resolved = true;
              cleanup();
              resolve();
            };
            const cleanup = () => {
              mediaEl.removeEventListener('seeked', finish);
              mediaEl.removeEventListener('canplay', finish);
              mediaEl.removeEventListener('error', finish);
            };
            mediaEl.addEventListener('seeked', finish);
            mediaEl.addEventListener('canplay', finish);
            mediaEl.addEventListener('error', finish);
          });
          promises.push(p);
        }
      });

      // 3. Wait for stability with a safety timeout
      const allReady = Promise.all(promises);
      const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
      await Promise.race([allReady, timeout]);

      // Wait for a frame to ensure the new time is propagated
      return new Promise<void>(resolve => {
        requestAnimationFrame(() => resolve());
      });
    }, timeInSeconds);
  }
}
