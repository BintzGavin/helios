import { Page } from 'playwright';
import { RenderStrategy } from './RenderStrategy';

export class CanvasStrategy implements RenderStrategy {
  async capture(page: Page, frameTime: number): Promise<Buffer> {
    const dataUrl = await page.evaluate((timeValue) => {
      // Direct access to document.timeline to set time
      (document.timeline as any).currentTime = timeValue;
      return new Promise<string>((resolve) => {
        requestAnimationFrame(() => {
          const canvas = document.querySelector('canvas');
          if (!canvas) return resolve('error:canvas-not-found');
          resolve(canvas.toDataURL('image/png'));
        });
      });
    }, frameTime);

    if (typeof dataUrl !== 'string' || dataUrl === 'error:canvas-not-found') {
      throw new Error('CanvasStrategy: Could not find canvas element or an error occurred during capture.');
    }

    // Extract base64 data
    return Buffer.from(dataUrl.split(',')[1], 'base64');
  }
}
