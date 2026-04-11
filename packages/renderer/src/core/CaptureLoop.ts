import { WorkerInfo } from './BrowserPool.js';
import { FFmpegManager } from './FFmpegManager.js';
import { RendererOptions, RenderJobOptions } from '../types.js';
import { RenderStrategy } from '../strategies/RenderStrategy.js';
import { TimeDriver } from '../drivers/TimeDriver.js';

const noopCatch = () => {};

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

  private writeToStdin(buffer: Buffer | string, onWriteError: (err?: Error | null) => void): Promise<void> | void {
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
        return new Promise<void>((resolve, reject) => {
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

    const onWriteError = (err?: Error | null) => {
        if (err) {
           if ((err as any).code === 'EPIPE') {
               console.warn('FFmpeg stdin closed prematurely during write (EPIPE). Ignoring error to allow graceful exit.');
           } else {
               this.ffmpegManager.emitError(err);
           }
        }
    };

    let nextFrameToSubmit = 0;
    let nextFrameToWrite = 0;
    const poolLen = this.pool.length;
    let maxPipelineDepth = poolLen * 2;
    maxPipelineDepth = Math.pow(2, Math.ceil(Math.log2(maxPipelineDepth)));
    const timeStep = 1000 / fps;
    const compTimeStep = 1 / fps;
    const signal = this.jobOptions?.signal;
    const onProgress = this.jobOptions?.onProgress;

    const framePromises = new Array<Promise<Buffer | string>>(maxPipelineDepth);

    while (nextFrameToWrite < this.totalFrames) {
        if (this.capturedErrors.length > 0) {
            throw this.capturedErrors[0];
        }
        if (signal && signal.aborted) {
            throw new Error('Aborted');
        }

        const inFlight = nextFrameToSubmit - nextFrameToWrite;

        if (inFlight <= poolLen) {
            const framesToSubmit = Math.min(
                this.totalFrames - nextFrameToSubmit,
                maxPipelineDepth - inFlight
            );

            for (let i = 0; i < framesToSubmit; i++) {
                const frameIndex = nextFrameToSubmit;
                const worker = this.pool[frameIndex % poolLen];
                const time = frameIndex * timeStep;
                const compositionTimeInSeconds = (this.startFrame + frameIndex) * compTimeStep;

                const framePromise = worker.activePromise
                    .catch(noopCatch)
                    .then(() => {
                        worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).then(undefined, noopCatch);
                        return worker.strategy.capture(worker.page, time);
                    });

                worker.activePromise = framePromise as unknown as Promise<void>;
                framePromises[frameIndex % maxPipelineDepth] = framePromise;
                nextFrameToSubmit++;
            }
        }

        const buffer = await framePromises[nextFrameToWrite % maxPipelineDepth]!;

        const currentFrame = nextFrameToWrite;

        if (currentFrame > 0 && currentFrame % progressInterval === 0) {
            console.log(`Progress: Rendered ${currentFrame} / ${this.totalFrames} frames`);
        }

        if (onProgress) {
           onProgress(currentFrame / this.totalFrames);
        }

        if (previousWritePromise) {
           await previousWritePromise;
        }

        const writeResult = this.writeToStdin(buffer, onWriteError);
        previousWritePromise = writeResult ? writeResult : undefined;

        nextFrameToWrite++;
    }

    if (previousWritePromise) {
        await previousWritePromise;
    }

    console.log('Finishing render strategy...');
    const finalBuffer = await this.pool[0].strategy.finish(this.pool[0].page);
    if (finalBuffer && ((Buffer.isBuffer(finalBuffer) && finalBuffer.length > 0) || (typeof finalBuffer === 'string' && finalBuffer.length > 0))) {
      console.log(`Writing final buffer...`);
      const writeResult = this.writeToStdin(finalBuffer, onWriteError);
      if (writeResult) await writeResult;
    }

    console.log('Finished sending frames. Closing FFmpeg stdin.');
    this.ffmpegManager.stdin?.end();
  }

}
