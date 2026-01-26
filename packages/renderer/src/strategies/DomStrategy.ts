import { Page } from 'playwright';
import { RenderStrategy } from './RenderStrategy';
import { RendererOptions } from '../types';

export class DomStrategy implements RenderStrategy {
  async diagnose(page: Page): Promise<void> {
    await page.evaluate(() => {
      console.log('[Helios Diagnostics] Checking DOM environment...');
      const report = {
        waapi: typeof document !== 'undefined' && 'timeline' in document,
        animations: typeof document.getAnimations === 'function' ? 'supported' : 'unsupported',
        userAgent: navigator.userAgent,
      };
      console.log(JSON.stringify(report, null, 2));
    });
  }

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

    let audioInputArgs: string[] = [];
    if (options.audioFilePath) {
      if (options.startFrame && options.startFrame > 0) {
        const startTime = options.startFrame / options.fps;
        audioInputArgs = ['-ss', startTime.toString(), '-i', options.audioFilePath];
      } else {
        audioInputArgs = ['-i', options.audioFilePath];
      }
    }

    // Use -t instead of -shortest to ensure video duration matches exact animation length,
    // even if audio is shorter (silence) or longer (cut).
    const audioOutputArgs = options.audioFilePath
      ? ['-c:a', 'aac', '-map', '0:v', '-map', '1:a', '-t', options.durationInSeconds.toString()]
      : [];

    const videoCodec = options.videoCodec || 'libx264';
    const pixelFormat = options.pixelFormat || 'yuv420p';

    const encodingArgs: string[] = [
      '-c:v', videoCodec,
      '-pix_fmt', pixelFormat,
      '-movflags', '+faststart',
    ];

    if (options.crf !== undefined) {
      encodingArgs.push('-crf', options.crf.toString());
    }

    if (options.preset) {
      encodingArgs.push('-preset', options.preset);
    }

    if (options.videoBitrate) {
      encodingArgs.push('-b:v', options.videoBitrate);
    }

    const outputArgs = [
      ...encodingArgs,
      ...audioOutputArgs,
      outputPath,
    ];

    return ['-y', ...videoInputArgs, ...audioInputArgs, ...outputArgs];
  }
}
