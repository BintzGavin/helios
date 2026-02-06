import { spawn } from 'child_process';
import { chromium, ConsoleMessage } from 'playwright';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { RenderStrategy } from './strategies/RenderStrategy.js';
import { CanvasStrategy } from './strategies/CanvasStrategy.js';
import { DomStrategy } from './strategies/DomStrategy.js';
import { TimeDriver } from './drivers/TimeDriver.js';
import { CdpTimeDriver } from './drivers/CdpTimeDriver.js';
import { SeekTimeDriver } from './drivers/SeekTimeDriver.js';
import { FFmpegInspector } from './utils/FFmpegInspector.js';
import { RendererOptions, RenderJobOptions } from './types.js';

const DEFAULT_BROWSER_ARGS = [
  '--use-gl=egl',
  '--ignore-gpu-blocklist',
  '--enable-gpu-rasterization',
  '--enable-zero-copy',
  '--disable-web-security',
  '--allow-file-access-from-files',
];

export class Renderer {
  private options: RendererOptions;
  private strategy: RenderStrategy;
  private timeDriver: TimeDriver;

  constructor(options: RendererOptions) {
    this.options = options;
    if (this.options.mode === 'dom') {
      this.strategy = new DomStrategy(this.options);
      this.timeDriver = new SeekTimeDriver(this.options.stabilityTimeout);
    } else {
      this.strategy = new CanvasStrategy(this.options);
      this.timeDriver = new CdpTimeDriver(this.options.stabilityTimeout);
    }
  }

  private getLaunchOptions() {
    const config = this.options.browserConfig || {};
    const userArgs = config.args || [];
    return {
      headless: config.headless ?? true,
      executablePath: config.executablePath,
      args: [...DEFAULT_BROWSER_ARGS, ...userArgs],
    };
  }

  public async diagnose(): Promise<any> {
    console.log(`Starting diagnostics (Mode: ${this.options.mode || 'canvas'})`);

    const browser = await chromium.launch(this.getLaunchOptions());

    try {
      const page = await browser.newPage();
      await page.goto('about:blank');
      const browserDiagnostics = await this.strategy.diagnose(page);

      const ffmpegPath = this.options.ffmpegPath || ffmpeg.path;
      const ffmpegDiagnostics = FFmpegInspector.inspect(ffmpegPath);

      return {
        browser: browserDiagnostics,
        ffmpeg: ffmpegDiagnostics,
      };
    } finally {
      await browser.close();
    }
  }

  public async render(compositionUrl: string, outputPath: string, jobOptions?: RenderJobOptions): Promise<void> {
    console.log(`Starting render for composition: ${compositionUrl} (Mode: ${this.options.mode || 'canvas'})`);

    const browser = await chromium.launch(this.getLaunchOptions());

    const context = await browser.newContext({
      viewport: {
        width: this.options.width,
        height: this.options.height,
      },
    });

    if (jobOptions?.tracePath) {
      console.log(`Enabling Playwright tracing. Trace will be saved to: ${jobOptions.tracePath}`);
      await context.tracing.start({ screenshots: true, snapshots: true });
    }

    try {
      const page = await context.newPage();

      console.log(`Navigating to ${compositionUrl}...`);

      const capturedErrors: Error[] = [];

      // Capture console logs from the page
      page.on('console', (msg: ConsoleMessage) => console.log(`PAGE LOG: ${msg.text()}`));
      page.on('pageerror', (err: Error) => {
        console.error(`PAGE ERROR: ${err.message}`);
        capturedErrors.push(err);
      });
      page.on('crash', () => {
        const err = new Error('Page crashed!');
        console.error(err.message);
        capturedErrors.push(err);
      });

      if (this.options.inputProps) {
        const serializedProps = JSON.stringify(this.options.inputProps);
        await page.addInitScript(`window.__HELIOS_PROPS__ = ${serializedProps};`);
      }

      console.log('Initializing time driver...');
      await this.timeDriver.init(page, this.options.randomSeed);

      await page.goto(compositionUrl, { waitUntil: 'networkidle' });
      console.log('Page loaded.');

      console.log('Running diagnostics...');
      const diagnostics = await this.strategy.diagnose(page);
      console.log('[Helios Diagnostics]', JSON.stringify(diagnostics, null, 2));

      console.log('Preparing render strategy...');
      await this.strategy.prepare(page);
      await this.timeDriver.prepare(page);
      console.log('Strategy prepared.');

      const ffmpegPath = this.options.ffmpegPath || ffmpeg.path;
      const totalFrames = this.options.frameCount
        ? this.options.frameCount
        : this.options.durationInSeconds * this.options.fps;
      const fps = this.options.fps;
      const startFrame = this.options.startFrame || 0;

      const { args, inputBuffers } = this.strategy.getFFmpegArgs(this.options, outputPath);

      const stdio: any[] = ['pipe', 'pipe', 'pipe'];
      const maxPipeIndex = Math.max(...inputBuffers.map(b => b.index), 2);
      while (stdio.length <= maxPipeIndex) {
        stdio.push('pipe');
      }

      const ffmpegProcess = spawn(ffmpegPath, args, { stdio });
      console.log(`Spawning FFmpeg: ${ffmpegPath} ${args.join(' ')}`);

      inputBuffers.forEach(({ index, buffer }) => {
        const pipe = ffmpegProcess.stdio[index] as any;
        if (pipe) {
          pipe.on('error', (err: any) => console.error(`Error writing to pipe ${index}:`, err));
          pipe.write(buffer);
          pipe.end();
        } else {
          console.error(`Failed to get pipe ${index} from FFmpeg process`);
        }
      });

      ffmpegProcess.stderr.on('data', (data: Buffer) => {
        console.error(`ffmpeg: ${data.toString()}`);
      });

      const ffmpegExitPromise = new Promise<void>((resolve, reject) => {
        ffmpegProcess.on('close', (code: number | null) => {
          if (code === 0) {
            resolve();
          } else {
            // If aborted, we expect a non-zero exit code (likely SIGKILL/SIGTERM).
            // We resolve the promise to prevent unhandled rejections, as the main flow handles the abort error.
            if (jobOptions?.signal?.aborted || capturedErrors.length > 0) {
              resolve();
            } else {
              reject(new Error(`FFmpeg process exited with code ${code}`));
            }
          }
        });
        ffmpegProcess.on('error', (err: Error) => {
            if (jobOptions?.signal?.aborted || capturedErrors.length > 0) {
              resolve();
            } else {
              reject(err);
            }
        });
      });

      // Handle AbortSignal
      const abortHandler = () => {
        console.log('Render aborted via signal. Killing FFmpeg...');
        ffmpegProcess.kill();
      };

      if (jobOptions?.signal) {
        if (jobOptions.signal.aborted) {
           throw new Error('Aborted');
        }
        jobOptions.signal.addEventListener('abort', abortHandler);
      }

      console.log(`Starting capture for ${totalFrames} frames...`);
      const progressInterval = Math.floor(totalFrames / 10);

      try {
        const captureLoop = async () => {
          for (let i = 0; i < totalFrames; i++) {
            if (capturedErrors.length > 0) {
              throw capturedErrors[0];
            }

            if (jobOptions?.signal?.aborted) {
              throw new Error('Aborted');
            }

            const time = (i / fps) * 1000;
            if (i > 0 && i % progressInterval === 0) {
                console.log(`Progress: Rendered ${i} / ${totalFrames} frames`);
            }

            if (jobOptions?.onProgress) {
               jobOptions.onProgress(i / totalFrames);
            }

            const compositionTimeInSeconds = (startFrame + i) / fps;
            await this.timeDriver.setTime(page, compositionTimeInSeconds);

            const buffer = await this.strategy.capture(page, time);

            await new Promise<void>((resolve, reject) => {
                // processing write errors is important, especially if ffmpeg died
                if (!ffmpegProcess.stdin.writable) {
                   return reject(new Error('FFmpeg stdin is not writable'));
                }
                ffmpegProcess.stdin.write(buffer, (err?: Error | null) => err ? reject(err) : resolve());
            });
          }

          console.log('Finishing render strategy...');
          const finalBuffer = await this.strategy.finish(page);
          if (finalBuffer && Buffer.isBuffer(finalBuffer) && finalBuffer.length > 0) {
            console.log(`Writing final buffer of ${finalBuffer.length} bytes...`);
            await new Promise<void>((resolve, reject) => {
               if (!ffmpegProcess.stdin.writable) {
                   return reject(new Error('FFmpeg stdin is not writable'));
                }
              ffmpegProcess.stdin.write(finalBuffer, (err?: Error | null) => err ? reject(err) : resolve());
            });
          }

          console.log('Finished sending frames. Closing FFmpeg stdin.');
          ffmpegProcess.stdin.end();
        };

        // Run capture loop and ffmpeg process in parallel.
        // If ffmpeg fails (e.g. invalid path), it will reject ffmpegExitPromise immediately,
        // which will cause Promise.all to reject, correctly propagating the error.
        await Promise.all([captureLoop(), ffmpegExitPromise]);

        console.log('FFmpeg has finished processing.');
      } catch (err: any) {
        // Kill FFmpeg if an error occurs to prevent it from hanging
        if (ffmpegProcess && !ffmpegProcess.killed) {
           ffmpegProcess.kill();
        }

        // If it was aborted, ensure we throw an AbortError-like message
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
      if (jobOptions?.tracePath) {
        console.log('Stopping tracing...');
        await context.tracing.stop({ path: jobOptions.tracePath });
      }
      await context.close();
      await browser.close();
      console.log('Browser closed.');

      if (this.strategy.cleanup) {
        console.log('Cleaning up strategy resources...');
        await this.strategy.cleanup();
      }
    }

    console.log(`Render complete! Output saved to: ${outputPath}`);
  }
}
