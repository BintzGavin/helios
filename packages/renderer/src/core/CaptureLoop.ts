import { WorkerInfo } from './BrowserPool.js';
import { FFmpegManager } from './FFmpegManager.js';
import { RendererOptions, RenderJobOptions } from '../types.js';
import { RenderStrategy } from '../strategies/RenderStrategy.js';
import { TimeDriver } from '../drivers/TimeDriver.js';

export class CaptureLoop {
  private drainResolve: (() => void) | null = null;
  private drainReject: ((err: Error) => void) | null = null;

  constructor(
    private options: RendererOptions,
    private pool: WorkerInfo[],
    private ffmpegManager: FFmpegManager,
    private totalFrames: number,
    private startFrame: number,
    private capturedErrors: Error[],
    private jobOptions?: RenderJobOptions
  ) {}

  private setupDrainListeners() {
    if (!this.ffmpegManager.stdin) return;
    this.ffmpegManager.stdin.on('drain', () => {
      if (this.drainResolve) {
        const resolve = this.drainResolve;
        this.drainResolve = null;
        this.drainReject = null;
        resolve();
      }
    });
    this.ffmpegManager.stdin.on('error', (err) => {
      if (this.drainReject) {
        const reject = this.drainReject;
        const resolve = this.drainResolve;
        this.drainResolve = null;
        this.drainReject = null;
        if (err && (err as any).code === 'EPIPE') {
           console.warn('FFmpeg stdin closed prematurely (EPIPE). Ignoring error to allow graceful exit.');
           // Resolve instead of reject on EPIPE to allow the process to finish handling existing frames
           if (resolve) resolve();
        } else {
           reject(err);
        }
      }
    });
    this.ffmpegManager.stdin.on('close', () => {
      if (this.drainReject) {
        const reject = this.drainReject;
        this.drainResolve = null;
        this.drainReject = null;
        reject(new Error('FFmpeg stdin closed before drain'));
      }
    });
  }

  private async writeToStdin(buffer: Buffer | string, onWriteError: (err?: Error | null) => void): Promise<void> {
    if (!this.ffmpegManager.stdin?.writable) {
      console.warn('FFmpeg stdin is not writable. Skipping write.');
      return;
    }

    let canWriteMore: boolean;
    if (typeof buffer === 'string') {
        canWriteMore = this.ffmpegManager.stdin.write(buffer, 'base64', onWriteError);
    } else {
        canWriteMore = this.ffmpegManager.stdin.write(buffer, onWriteError);
    }

    if (!canWriteMore) {
        await new Promise<void>((resolve, reject) => {
            this.drainResolve = resolve;
            this.drainReject = reject;
        });
    }
  }

  public async run(): Promise<void> {
    this.setupDrainListeners();
    const fps = this.options.fps;
    const progressInterval = Math.floor(this.totalFrames / 10);

    let previousWritePromise: Promise<void> | undefined;

    const noopCatch = () => {};
    const onWriteError = (err?: Error | null) => {
        if (err) {
           if ((err as any).code === 'EPIPE') {
               console.warn('FFmpeg stdin closed prematurely during write (EPIPE). Ignoring error to allow graceful exit.');
           } else {
               this.ffmpegManager.emitError(err);
           }
        }
    };

    const captureWorkerFrame = (activePromise: Promise<void>, timeDriver: TimeDriver, page: import('playwright').Page, strategy: RenderStrategy, compositionTimeInSeconds: number, time: number): Promise<Buffer | string> => {
        return activePromise
            .catch(noopCatch)
            .then(() => {
                timeDriver.setTime(page, compositionTimeInSeconds).then(undefined, noopCatch);
                return strategy.capture(page, time);
            });
    };

    let nextFrameToSubmit = 0;
    let nextFrameToWrite = 0;
    const poolLen = this.pool.length;
    const maxPipelineDepth = poolLen * 2;
    let framePromises: Promise<Buffer | string>[] = new Array(maxPipelineDepth);
    const timeStep = 1000 / fps;
    const compTimeStep = 1 / fps;
    const signal = this.jobOptions?.signal;
    const onProgress = this.jobOptions?.onProgress;

    while (nextFrameToWrite < this.totalFrames) {
        if (this.capturedErrors.length > 0) {
            throw this.capturedErrors[0];
        }
        if (signal && signal.aborted) {
            throw new Error('Aborted');
        }

        while (nextFrameToSubmit < this.totalFrames && (nextFrameToSubmit - nextFrameToWrite) < maxPipelineDepth) {
            const frameIndex = nextFrameToSubmit;
            const worker = this.pool[frameIndex % poolLen];
            const time = frameIndex * timeStep;
            const compositionTimeInSeconds = (this.startFrame + frameIndex) * compTimeStep;

            const framePromise = captureWorkerFrame(worker.activePromise, worker.timeDriver, worker.page, worker.strategy, compositionTimeInSeconds, time);

            worker.activePromise = framePromise as unknown as Promise<void>;
            framePromises[nextFrameToSubmit % maxPipelineDepth] = framePromise;
            nextFrameToSubmit++;
        }

        const buffer = await framePromises[nextFrameToWrite % maxPipelineDepth]!;

        const i = nextFrameToWrite;

        if (i > 0 && i % progressInterval === 0) {
            console.log(`Progress: Rendered ${i} / ${this.totalFrames} frames`);
        }

        if (onProgress) {
           onProgress(i / this.totalFrames);
        }

        if (previousWritePromise) {
           await previousWritePromise;
        }

        previousWritePromise = this.writeToStdin(buffer, onWriteError);

        nextFrameToWrite++;
    }

    if (previousWritePromise) {
        await previousWritePromise;
    }

    console.log('Finishing render strategy...');
    const finalBuffer = await this.pool[0].strategy.finish(this.pool[0].page);
    if (finalBuffer && ((Buffer.isBuffer(finalBuffer) && finalBuffer.length > 0) || (typeof finalBuffer === 'string' && finalBuffer.length > 0))) {
      console.log(`Writing final buffer...`);
      await this.writeToStdin(finalBuffer, onWriteError);
    }

    console.log('Finished sending frames. Closing FFmpeg stdin.');
    this.ffmpegManager.stdin?.end();
  }
}
