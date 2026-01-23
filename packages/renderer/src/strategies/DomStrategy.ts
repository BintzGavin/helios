import { Page } from 'playwright';
import { RenderStrategy } from './RenderStrategy';

export class DomStrategy implements RenderStrategy {
  async prepare(page: Page): Promise<void> {
    // No-op for now.
    return Promise.resolve();
  }

  async capture(page: Page, frameTime: number): Promise<Buffer> {
    await page.evaluate((timeValue) => {
      (document.timeline as any).currentTime = timeValue;
      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    }, frameTime);

    return await page.screenshot({ type: 'png' });
  }

  async finish(page: Page): Promise<void> {
    // No-op for DomStrategy
    return Promise.resolve();
  }

  getFFmpegInputArgs(config: { fps: number }): string[] {
    return [
      '-f', 'image2pipe',
      '-framerate', `${config.fps}`,
      '-i', '-',
    ];
  }
}
