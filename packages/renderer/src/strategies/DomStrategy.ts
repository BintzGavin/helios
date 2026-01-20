import { Page } from 'playwright';
import { RenderStrategy } from './RenderStrategy';

export class DomStrategy implements RenderStrategy {
  async capture(page: Page, frameTime: number): Promise<Buffer> {
    try {
      await page.evaluate((timeValue) => {
        (document.timeline as any).currentTime = timeValue;
        return new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      }, frameTime);

      return await page.screenshot({ type: 'png' });
    } catch (error) {
      console.error('DomStrategy.capture: failed to capture screenshot', {
        frameTime,
        error,
      });
      throw error;
    }
  }
}
