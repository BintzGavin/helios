import { Page } from 'playwright';
import { RenderStrategy } from './RenderStrategy';
import { RendererOptions } from '../types';

export class DomStrategy implements RenderStrategy {
  async prepare(page: Page): Promise<void> {
    await page.evaluate(async () => {
      // 1. Wait for fonts
      await document.fonts.ready;

      // 2. Wait for images
      const images = Array.from(document.images);
      await Promise.all(images.map((img) => {
        if (img.complete) return;
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve; // Don't block on broken images
        });
      }));
    });
  }

  async capture(page: Page, frameTime: number): Promise<Buffer> {
    return await page.screenshot({ type: 'png' });
  }

  async finish(page: Page): Promise<void> {
    // No-op for DomStrategy
    return Promise.resolve();
  }

  getFFmpegArgs(options: RendererOptions, outputPath: string): string[] {
    const videoInputArgs = [
      '-f', 'image2pipe',
      '-framerate', `${options.fps}`,
      '-i', '-',
    ];

    const audioInputArgs = options.audioFilePath ? ['-i', options.audioFilePath] : [];

    const audioOutputArgs = options.audioFilePath
      ? ['-c:a', 'aac', '-map', '0:v', '-map', '1:a', '-shortest']
      : [];

    const outputArgs = [
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      ...audioOutputArgs,
      outputPath,
    ];

    return ['-y', ...videoInputArgs, ...audioInputArgs, ...outputArgs];
  }
}
