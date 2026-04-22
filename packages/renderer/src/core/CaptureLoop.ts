import { WorkerInfo } from './BrowserPool.js';
import { FFmpegManager } from './FFmpegManager.js';
import { RendererOptions, RenderJobOptions } from '../types.js';
import { RenderStrategy } from '../strategies/RenderStrategy.js';
import { TimeDriver } from '../drivers/TimeDriver.js';

const noopCatch = () => {};

export class CaptureLoop {
  private drainResolve: (() => void) | null = null;
  private drainReject: ((err: Error) => void) | null = null;

  private handleWriteError = (err?: Error | null) => {
    if (err) {
       if ((err as any).code === 'EPIPE') {
           console.warn('FFmpeg stdin closed prematurely during write (EPIPE). Ignoring error to allow graceful exit.');
       } else {
           this.ffmpegManager.emitError(err);
       }
    }
  };

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

    const poolLen = this.pool.length;
    let maxPipelineDepth = poolLen * 2;
    maxPipelineDepth = Math.pow(2, Math.ceil(Math.log2(maxPipelineDepth)));
    const ringMask = maxPipelineDepth - 1;
    const timeStep = 1000 / fps;
    const compTimeStep = 1 / fps;
    const signal = this.jobOptions?.signal;
    const onProgress = this.jobOptions?.onProgress;

    const frameBufferRing = new Array<Buffer | string | null>(maxPipelineDepth).fill(null);
    const frameErrorRing = new Array<any>(maxPipelineDepth).fill(null);
    const frameReadyRing = new Uint8Array(maxPipelineDepth); // 0 = not ready, 1 = ready
    let writerWaiterResolve: (() => void) | null = null;
    const writerWaiterExecutor = (resolve: () => void) => { writerWaiterResolve = resolve; };

    // Multi-worker ACTOR MODEL with backpressure
    let nextFrameToSubmit = 0;
    let nextFrameToWrite = 0;
    let aborted = false;
    const workerBlockedResolves = new Array<((i: number) => void) | null>(poolLen).fill(null);
    let frameWaiterResolve: (() => void) | null = null;
    const frameWaiterExecutor = (resolve: () => void) => { frameWaiterResolve = resolve; };

    const checkState = () => {
        if (this.capturedErrors.length > 0 || (signal && signal.aborted)) {
            aborted = true;
        }

        if (aborted) {
            for (let w = 0; w < poolLen; w++) {
                if (workerBlockedResolves[w]) {
                    workerBlockedResolves[w]!(-1);
                    workerBlockedResolves[w] = null;
                }
            }
            if (frameWaiterResolve) {
                const res = frameWaiterResolve;
                frameWaiterResolve = null;
                res();
            }
            if (writerWaiterResolve) {
                const res = writerWaiterResolve;
                writerWaiterResolve = null;
                res();
            }
            return;
        }

        // See if we can assign tasks to waiting workers
        for (let w = 0; w < poolLen; w++) {
            if (!workerBlockedResolves[w] || nextFrameToSubmit >= this.totalFrames || nextFrameToSubmit - nextFrameToWrite >= maxPipelineDepth) {
                continue;
            }
            const res = workerBlockedResolves[w]!;
            workerBlockedResolves[w] = null;
            const i = nextFrameToSubmit++;
            const ringIndex = i & ringMask;

            frameReadyRing[ringIndex] = 0;
            frameBufferRing[ringIndex] = null;
            frameErrorRing[ringIndex] = null;

            // If main loop is waiting for a frame to be queued, wake it up
            if (frameWaiterResolve) {
                const fRes = frameWaiterResolve;
                frameWaiterResolve = null;
                fRes();
            }

            res(i);
        }

        // If we still have waiting workers but are at totalFrames, tell them to stop
        if (nextFrameToSubmit >= this.totalFrames) {
            for (let w = 0; w < poolLen; w++) {
                if (workerBlockedResolves[w]) {
                    workerBlockedResolves[w]!(-1);
                    workerBlockedResolves[w] = null;
                }
            }
        }
    };


    const workerBlockedExecutors = new Array(poolLen);
    for (let w = 0; w < poolLen; w++) {
        workerBlockedExecutors[w] = (resolve: (i: number) => void) => {
            workerBlockedResolves[w] = resolve;
        };
    }

    const runWorker = async (worker: WorkerInfo, workerIndex: number) => {
        const { timeDriver, strategy, page } = worker;

        while (!aborted) {
            let i: number;
            if (aborted || nextFrameToSubmit >= this.totalFrames) {
                i = -1;
            } else if (nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth) {
                i = nextFrameToSubmit++;
                const ringIndex = i & ringMask;

                frameReadyRing[ringIndex] = 0;
                frameBufferRing[ringIndex] = null;
                frameErrorRing[ringIndex] = null;

                if (frameWaiterResolve) {
                    const fRes = frameWaiterResolve;
                    frameWaiterResolve = null;
                    fRes();
                }
            } else {
                i = await new Promise<number>(workerBlockedExecutors[workerIndex]);
            }

            if (i === -1) break;

            const time = i * timeStep;
            const compositionTimeInSeconds = (this.startFrame + i) * compTimeStep;

            const ringIndex = i & ringMask;

            try {
                const timePromise = timeDriver.setTime(page, compositionTimeInSeconds);
                if (timePromise) {
                    timePromise.catch(noopCatch);
                }
                const buffer = await strategy.capture(page, time);
                frameBufferRing[ringIndex] = buffer;
                frameReadyRing[ringIndex] = 1;
            } catch (e) {
                frameErrorRing[ringIndex] = e;
                frameReadyRing[ringIndex] = 1;
            }
            if (writerWaiterResolve) {
                const res = writerWaiterResolve;
                writerWaiterResolve = null;
                res();
            }
        }
    };

    const workerPromises = this.pool.map((w, i) => runWorker(w, i));

    try {
        while (nextFrameToWrite < this.totalFrames && !aborted) {
            checkState();
            if (aborted) break;

            // Wait for the task to be queued by a worker or immediately queued
            if (nextFrameToSubmit <= nextFrameToWrite) {
                await new Promise<void>(frameWaiterExecutor);
                continue;
            }

            const ringIndex = nextFrameToWrite & ringMask;
            if (frameReadyRing[ringIndex] === 0) {
                await new Promise<void>(writerWaiterExecutor);
                continue;
            }

            const error = frameErrorRing[ringIndex];
            if (error) throw error;
            const buffer = frameBufferRing[ringIndex]!;

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

            const writeResult = this.writeToStdin(buffer, this.handleWriteError);
            previousWritePromise = writeResult ? writeResult : undefined;

            nextFrameToWrite++;
            checkState(); // This will unblock a waiting worker if we just opened up pipeline capacity
        }
    } catch (e) {
        aborted = true;
        checkState();
        throw e;
    }

    aborted = true;
    checkState();

    if (this.capturedErrors.length > 0) {
        throw this.capturedErrors[0];
    }
    if (signal && signal.aborted) {
        throw new Error('Aborted');
    }

    await Promise.all(workerPromises);

    if (previousWritePromise) {
        await previousWritePromise;
    }

    console.log('Finishing render strategy...');
    const finalBuffer = await this.pool[0].strategy.finish(this.pool[0].page);
    if (finalBuffer && ((Buffer.isBuffer(finalBuffer) && finalBuffer.length > 0) || (typeof finalBuffer === 'string' && finalBuffer.length > 0))) {
      console.log(`Writing final buffer...`);
      const writeResult = this.writeToStdin(finalBuffer, this.handleWriteError);
      if (writeResult) await writeResult;
    }

    console.log('Finished sending frames. Closing FFmpeg stdin.');
    this.ffmpegManager.stdin?.end();
  }

}
