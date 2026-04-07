import { RendererOptions, RenderJobOptions } from './types.js';
import { BrowserPool } from './core/BrowserPool.js';
import { FFmpegManager } from './core/FFmpegManager.js';
import { CaptureLoop } from './core/CaptureLoop.js';
import { Diagnostics } from './core/Diagnostics.js';

export class Renderer {
  private options: RendererOptions;

  constructor(options: RendererOptions) {
    this.options = options;
  }

  public async diagnose(): Promise<any> {
    const diagnostics = new Diagnostics(this.options);
    return diagnostics.run();
  }

  public async render(compositionUrl: string, outputPath: string, jobOptions?: RenderJobOptions): Promise<void> {
    console.log(`Starting render for composition: ${compositionUrl} (Mode: ${this.options.mode || 'canvas'})`);

    const diagnostics = new Diagnostics(this.options);
    diagnostics.validateHardwareAcceleration();

    const pool = new BrowserPool(this.options);
    const ffmpegManager = new FFmpegManager(this.options, jobOptions);

    try {
      await pool.init(compositionUrl, jobOptions);

      console.log('Running diagnostics on first page...');
      const firstWorker = pool.workers[0];
      const strategyDiagnostics = await firstWorker.strategy.diagnose(firstWorker.page);
      console.log('[Helios Diagnostics]', JSON.stringify(strategyDiagnostics, null, 2));

      const totalFrames = this.options.frameCount
        ? this.options.frameCount
        : this.options.durationInSeconds * this.options.fps;
      const startFrame = this.options.startFrame || 0;

      const { args, inputBuffers } = firstWorker.strategy.getFFmpegArgs(this.options, outputPath);
      ffmpegManager.spawn(args, inputBuffers);

      const ffmpegExitPromise = ffmpegManager.getExitPromise(pool.capturedErrors);

      const abortHandler = () => {
        console.log('Render aborted via signal. Killing FFmpeg...');
        ffmpegManager.kill();
      };

      if (jobOptions?.signal) {
        if (jobOptions.signal.aborted) {
           throw new Error('Aborted');
        }
        jobOptions.signal.addEventListener('abort', abortHandler);
      }

      console.log(`Starting capture for ${totalFrames} frames...`);

      try {
        const captureLoop = new CaptureLoop(
          this.options,
          pool.workers,
          ffmpegManager,
          totalFrames,
          startFrame,
          pool.capturedErrors,
          jobOptions
        );

        await Promise.all([captureLoop.run(), ffmpegExitPromise]);

        console.log('FFmpeg has finished processing.');
      } catch (err: any) {
        ffmpegManager.kill();

        if (jobOptions?.signal?.aborted) {
           throw new Error('Aborted');
        }
        throw err;
      } finally {
        if (jobOptions?.signal) {
          jobOptions.signal.removeEventListener('abort', abortHandler);
        }
      }

    } finally {
      await pool.close(jobOptions);
      await pool.cleanupStrategies();
    }

    console.log(`Render complete! Output saved to: ${outputPath}`);
  }
}
