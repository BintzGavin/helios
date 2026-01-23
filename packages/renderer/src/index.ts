import { spawn } from 'child_process';
import { chromium, Browser, Page } from 'playwright';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { RenderStrategy } from './strategies/RenderStrategy';
import { CanvasStrategy } from './strategies/CanvasStrategy';
import { DomStrategy } from './strategies/DomStrategy';
import { RendererOptions } from './types';

export { RendererOptions } from './types';

export class Renderer {
  private options: RendererOptions;
  private strategy: RenderStrategy;

  constructor(options: RendererOptions) {
    this.options = options;
    if (this.options.mode === 'dom') {
      this.strategy = new DomStrategy();
    } else {
      this.strategy = new CanvasStrategy();
    }
  }

  public async render(compositionUrl: string, outputPath: string): Promise<void> {
    console.log(`Starting render for composition: ${compositionUrl} (Mode: ${this.options.mode || 'canvas'})`);

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--use-gl=egl',
        '--ignore-gpu-blocklist',
        '--enable-gpu-rasterization',
        '--enable-zero-copy',
        '--disable-web-security',
        '--allow-file-access-from-files',
      ],
    });

    try {
      const page = await browser.newPage({
        viewport: {
          width: this.options.width,
          height: this.options.height,
        },
      });

      console.log(`Navigating to ${compositionUrl}...`);

      // Capture console logs from the page
      page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
      page.on('pageerror', err => console.error(`PAGE ERROR: ${err.message}`));

      await page.goto(compositionUrl, { waitUntil: 'networkidle' });
      console.log('Page loaded.');

      console.log('Preparing render strategy...');
      await this.strategy.prepare(page);
      console.log('Strategy prepared.');

      const ffmpegPath = ffmpeg.path;
      const totalFrames = this.options.durationInSeconds * this.options.fps;
      const fps = this.options.fps;

      const args = this.strategy.getFFmpegArgs(this.options, outputPath);

      const ffmpegProcess = spawn(ffmpegPath, args);
      console.log(`Spawning FFmpeg: ${ffmpegPath} ${args.join(' ')}`);

      ffmpegProcess.stderr.on('data', (data: Buffer) => {
        console.error(`ffmpeg: ${data.toString()}`);
      });

      const ffmpegExitPromise = new Promise<void>((resolve, reject) => {
        ffmpegProcess.on('close', (code: number | null) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`FFmpeg process exited with code ${code}`));
          }
        });
        ffmpegProcess.on('error', (err: Error) => {
            reject(err);
        });
      });

      console.log(`Starting capture for ${totalFrames} frames...`);
      const progressInterval = Math.floor(totalFrames / 10);
      for (let i = 0; i < totalFrames; i++) {
        const time = (i / fps) * 1000;
        if (i > 0 && i % progressInterval === 0) {
            console.log(`Progress: Rendered ${i} / ${totalFrames} frames`);
        }

        const buffer = await this.strategy.capture(page, time);

        await new Promise<void>((resolve, reject) => {
            ffmpegProcess.stdin.write(buffer, (err?: Error | null) => err ? reject(err) : resolve());
        });
      }

      console.log('Finishing render strategy...');
      const finalBuffer = await this.strategy.finish(page);
      if (finalBuffer && Buffer.isBuffer(finalBuffer) && finalBuffer.length > 0) {
        console.log(`Writing final buffer of ${finalBuffer.length} bytes...`);
        await new Promise<void>((resolve, reject) => {
          ffmpegProcess.stdin.write(finalBuffer, (err?: Error | null) => err ? reject(err) : resolve());
        });
      }

      console.log('Finished sending frames. Closing FFmpeg stdin.');
      ffmpegProcess.stdin.end();

      await ffmpegExitPromise;
      console.log('FFmpeg has finished processing.');

    } finally {
      await browser.close();
      console.log('Browser closed.');
    }

    console.log(`Render complete! Output saved to: ${outputPath}`);
  }
}
