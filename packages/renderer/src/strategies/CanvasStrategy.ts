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

    if (dataUrl === 'error:canvas-not-found') {
      throw new Error('CanvasStrategy: Could not find canvas element or an error occurred during capture.');
    }

    // Extract base64 data safely from data URL
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1 || commaIndex === dataUrl.length - 1) {
      throw new Error('CanvasStrategy: Received invalid data URL from canvas.');
    }

    const base64Data = dataUrl.slice(commaIndex + 1);
    return Buffer.from(base64Data, 'base64');
  }
}
