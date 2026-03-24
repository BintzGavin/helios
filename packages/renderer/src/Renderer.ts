import { spawn } from 'child_process';
import { chromium, ConsoleMessage } from 'playwright';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import os from 'os';
import { RenderStrategy } from './strategies/RenderStrategy.js';
import { CanvasStrategy } from './strategies/CanvasStrategy.js';
import { DomStrategy } from './strategies/DomStrategy.js';
import { TimeDriver } from './drivers/TimeDriver.js';
import { CdpTimeDriver } from './drivers/CdpTimeDriver.js';
import { SeekTimeDriver } from './drivers/SeekTimeDriver.js';
import { FFmpegInspector } from './utils/FFmpegInspector.js';
import { RendererOptions, RenderJobOptions } from './types.js';

const DEFAULT_BROWSER_ARGS = [
  '--disable-web-security',
  '--allow-file-access-from-files',
  '--enable-begin-frame-control',
  '--run-all-compositor-stages-before-draw'
];

const GPU_DISABLED_ARGS = [
  '--disable-gpu',
  '--disable-software-rasterizer',
  '--disable-gpu-compositing',
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
    const gpuArgs = config.gpu === false ? GPU_DISABLED_ARGS : [];
    return {
      headless: config.headless ?? true,
      executablePath: config.executablePath,
      args: [...DEFAULT_BROWSER_ARGS, ...gpuArgs, ...userArgs],
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

    // Validate Hardware Acceleration
    const ffmpegPath = this.options.ffmpegPath || ffmpeg.path;
    const ffmpegInfo = FFmpegInspector.inspect(ffmpegPath);
    console.log(`[Helios Diagnostics] FFmpeg Version: ${ffmpegInfo.version}`);
    console.log(`[Helios Diagnostics] FFmpeg HW Accel: ${ffmpegInfo.hwaccels.join(', ') || 'none'}`);

    if (this.options.hwAccel && this.options.hwAccel !== 'auto') {
      if (!ffmpegInfo.hwaccels.includes(this.options.hwAccel)) {
        console.warn(`[Helios Warning] Hardware acceleration '${this.options.hwAccel}' was requested but is not listed in 'ffmpeg -hwaccels' output. Available: ${ffmpegInfo.hwaccels.join(', ') || 'none'}`);
      }
    }

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

    let pool: { page: import('playwright').Page, strategy: RenderStrategy, timeDriver: TimeDriver, activePromise: Promise<void> }[] = [];
    try {
      const cpus = os.cpus().length || 4;
      const concurrency = Math.min(Math.ceil(cpus * 1.5), 8);
      console.log(`Initializing pool of ${concurrency} pages...`);

      const capturedErrors: Error[] = [];

      const createPage = async (index: number) => {
        const page = await context.newPage();
        const strategy = this.options.mode === 'dom' ? new DomStrategy(this.options) : new CanvasStrategy(this.options);
        const timeDriver = this.options.mode === 'dom' ? new SeekTimeDriver(this.options.stabilityTimeout) : new CdpTimeDriver(this.options.stabilityTimeout);

        page.on('console', (msg: ConsoleMessage) => console.log(`PAGE LOG [${index}]: ${msg.text()}`));
        page.on('pageerror', (err: Error) => {
          console.error(`PAGE ERROR [${index}]: ${err.message}`);
          capturedErrors.push(err);
        });
        page.on('crash', () => {
          const err = new Error(`Page ${index} crashed!`);
          console.error(err.message);
          capturedErrors.push(err);
        });

        if (this.options.inputProps) {
          const serializedProps = JSON.stringify(this.options.inputProps);
          await page.addInitScript(`window.__HELIOS_PROPS__ = ${serializedProps};`);
        }

        await timeDriver.init(page, this.options.randomSeed);
        await page.goto(compositionUrl, { waitUntil: 'networkidle' });

        await strategy.prepare(page);
        await timeDriver.prepare(page);

        return { page, strategy, timeDriver, activePromise: Promise.resolve() };
      };

      const poolPromises = [];
      for (let i = 0; i < concurrency; i++) {
        poolPromises.push(createPage(i));
      }
      pool = await Promise.all(poolPromises);

      console.log('All pages loaded and prepared.');

      console.log('Running diagnostics on first page...');
      const diagnostics = await pool[0].strategy.diagnose(pool[0].page);
      console.log('[Helios Diagnostics]', JSON.stringify(diagnostics, null, 2));

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
          let previousWritePromise: Promise<void> | undefined;
          let framePromises: Promise<Buffer>[] = [];

          // To maximize parallel page utilization, we need to decouple frame production from writing
          // such that multiple workers can be evaluating frames concurrently.

          let nextFrameToSubmit = 0;
          let nextFrameToWrite = 0;

          while (nextFrameToWrite < totalFrames) {
              if (capturedErrors.length > 0) {
                  throw capturedErrors[0];
              }
              if (jobOptions?.signal?.aborted) {
                  throw new Error('Aborted');
              }

              // Refill the active pipeline up to the pool size
              while (nextFrameToSubmit < totalFrames && (nextFrameToSubmit - nextFrameToWrite) < pool.length * 8) {
                  const frameIndex = nextFrameToSubmit;
                  const worker = pool[frameIndex % pool.length];
                  const time = (frameIndex / fps) * 1000;
                  const compositionTimeInSeconds = (startFrame + frameIndex) / fps;

                  const framePromise = worker.activePromise
                      .then(() => worker.timeDriver.setTime(worker.page, compositionTimeInSeconds))
                      .then(() => worker.strategy.capture(worker.page, time));

                  // Add a no-op catch handler to prevent unhandled promise rejections on abort/error
                  worker.activePromise = framePromise.catch(() => {}) as Promise<void>;

                  framePromises.push(framePromise);
                  nextFrameToSubmit++;
              }

              const buffer = await framePromises[nextFrameToWrite]!;
              framePromises[nextFrameToWrite] = null as any; // Allow GC

              const i = nextFrameToWrite;

              if (i > 0 && i % progressInterval === 0) {
                  console.log(`Progress: Rendered ${i} / ${totalFrames} frames`);
              }

              if (jobOptions?.onProgress) {
                 jobOptions.onProgress(i / totalFrames);
              }

              if (previousWritePromise) {
                 await previousWritePromise;
              }

              if (!ffmpegProcess.stdin.writable) {
                 throw new Error('FFmpeg stdin is not writable');
              }

              const canWriteMore = ffmpegProcess.stdin.write(buffer, (err?: Error | null) => {
                  if (err) {
                     ffmpegProcess.emit('error', err);
                  }
              });

              if (!canWriteMore) {
                  previousWritePromise = new Promise<void>((resolve, reject) => {
                      const onDrain = () => {
                          cleanup();
                          resolve();
                      };
                      const onError = (err: Error) => {
                          cleanup();
                          reject(err);
                      };
                      const onClose = () => {
                          cleanup();
                          reject(new Error('FFmpeg stdin closed before drain'));
                      };

                      const cleanup = () => {
                          ffmpegProcess.stdin.removeListener('drain', onDrain);
                          ffmpegProcess.stdin.removeListener('error', onError);
                          ffmpegProcess.stdin.removeListener('close', onClose);
                      };

                      ffmpegProcess.stdin.once('drain', onDrain);
                      ffmpegProcess.stdin.once('error', onError);
                      ffmpegProcess.stdin.once('close', onClose);
                  });
              } else {
                  previousWritePromise = undefined;
              }

              nextFrameToWrite++;
          }

          if (previousWritePromise) {
              await previousWritePromise;
          }

          console.log('Finishing render strategy...');
          const finalBuffer = await pool[0].strategy.finish(pool[0].page);
          if (finalBuffer && Buffer.isBuffer(finalBuffer) && finalBuffer.length > 0) {
            console.log(`Writing final buffer of ${finalBuffer.length} bytes...`);
            if (!ffmpegProcess.stdin.writable) {
               throw new Error('FFmpeg stdin is not writable');
            }

            const canWriteMore = ffmpegProcess.stdin.write(finalBuffer, (err?: Error | null) => {
                if (err) {
                   ffmpegProcess.emit('error', err);
                }
            });

            if (!canWriteMore) {
                await new Promise<void>((resolve, reject) => {
                    const onDrain = () => {
                        cleanup();
                        resolve();
                    };
                    const onError = (err: Error) => {
                        cleanup();
                        reject(err);
                    };
                    const onClose = () => {
                        cleanup();
                        reject(new Error('FFmpeg stdin closed before drain'));
                    };

                    const cleanup = () => {
                        ffmpegProcess.stdin.removeListener('drain', onDrain);
                        ffmpegProcess.stdin.removeListener('error', onError);
                        ffmpegProcess.stdin.removeListener('close', onClose);
                    };

                    ffmpegProcess.stdin.once('drain', onDrain);
                    ffmpegProcess.stdin.once('error', onError);
                    ffmpegProcess.stdin.once('close', onClose);
                });
            }
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

      console.log('Cleaning up strategy resources...');
      for (const worker of pool) {
          if (worker.strategy.cleanup) {
              await worker.strategy.cleanup();
          }
      }
    }

    console.log(`Render complete! Output saved to: ${outputPath}`);
  }
}
