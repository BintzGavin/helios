import { WorkerInfo } from './BrowserPool.js';
import { FFmpegManager } from './FFmpegManager.js';
import { RendererOptions, RenderJobOptions } from '../types.js';
import { RenderStrategy } from '../strategies/RenderStrategy.js';
import { TimeDriver } from '../drivers/TimeDriver.js';

const noopCatch = () => {};

export class CaptureLoop {
  private drainResolve: (() => void) | null = null;
  private drainReject: ((err: Error) => void) | null = null;
  private drainPromiseExecutor = (resolve: () => void, reject: (err: Error) => void) => { this.drainResolve = resolve; this.drainReject = reject; };

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
      if (err && (err as any).code === 'EPIPE') {
         console.warn('FFmpeg stdin closed prematurely (EPIPE). Ignoring error to allow graceful exit.');
         if (this.drainResolve) {
           const resolve = this.drainResolve;
           this.drainResolve = null;
           this.drainReject = null;
           resolve();
         }
      } else {
        if (this.drainReject) {
          const reject = this.drainReject;
          this.drainResolve = null;
          this.drainReject = null;
          reject(err);
        } else {
          this.ffmpegManager.emitError(err);
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



  public async run(): Promise<void> {
    this.setupDrainListeners();
    const fps = this.options.fps;
    const totalFrames = this.totalFrames;
    const startFrame = this.startFrame;
    const capturedErrors = this.capturedErrors;
    const stdin = this.ffmpegManager.stdin;

    const progressInterval = Math.floor(totalFrames / 10);
    let nextProgressFrame = progressInterval;

    let previousWritePromise: Promise<void> | undefined;

    const timeStep = 1000 / fps;
    const compTimeStep = 1 / fps;
    const poolLen = this.pool.length;

    // FAST PATH FOR SINGLE WORKER
    if (poolLen === 1) {
        const worker = this.pool[0];
        const { timeDriver, strategy, page } = worker;
        let fatalError: any = null;

        const signal = this.jobOptions?.signal;
        const onProgress = this.jobOptions?.onProgress;
        try {
            for (let i = 0; i < totalFrames; i++) {
                if (capturedErrors.length > 0 || (signal && signal.aborted)) break;

                const time = i * timeStep;
                const compositionTimeInSeconds = (startFrame + i) * compTimeStep;

                const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
                const buffer = setTimeResult
                    ? await setTimeResult.then(() => strategy.capture(page, time))
                    : await strategy.capture(page, time);

                if (i === nextProgressFrame) {
                    console.log(`Progress: Rendered ${i} / ${totalFrames} frames`);
                    nextProgressFrame += progressInterval;
                }

                if (onProgress) {
                    onProgress(i / totalFrames);
                }

                if (previousWritePromise) {
                    await previousWritePromise;
                    previousWritePromise = undefined;
                }

                if (stdin?.writable) {
                    let canWriteMore: boolean;
                    if (typeof buffer === 'string') {
                        canWriteMore = stdin.write(buffer, 'base64');
                    } else {
                        canWriteMore = stdin.write(buffer);
                    }

                    if (!canWriteMore) {
                        previousWritePromise = new Promise<void>(this.drainPromiseExecutor);
                    }
                } else {
                    console.warn('FFmpeg stdin is not writable. Skipping write.');
                }
            }
        } catch (e) {
            fatalError = e;
        }

        if (fatalError) throw fatalError;
        if (capturedErrors.length > 0) throw capturedErrors[0];
        if (signal && signal.aborted) throw new Error('Aborted');

        if (previousWritePromise) {
            await previousWritePromise;
        }
    } else {
    let maxPipelineDepth = 64;
    maxPipelineDepth = Math.pow(2, Math.ceil(Math.log2(maxPipelineDepth)));
    const ringMask = maxPipelineDepth - 1;
    const timeStep = 1000 / fps;
    const compTimeStep = 1 / fps;
    const signal = this.jobOptions?.signal;
    const onProgress = this.jobOptions?.onProgress;

    const frameBufferRing = new Array<Buffer | string | null>(maxPipelineDepth).fill(null);
    const frameReadyRing = new Uint8Array(maxPipelineDepth); // 0 = not ready, 1 = ready
    let fatalError: any = null;
    let writerWaiterResolve: (() => void) | null = null;
    const writerWaiterExecutor = (resolve: () => void) => { writerWaiterResolve = resolve; };

    // Multi-worker ACTOR MODEL with backpressure
    let nextFrameToSubmit = 0;
    let nextFrameToWrite = 0;
    let aborted = false;
    const workerBlockedResolves = new Array<((i: number) => void) | null>(poolLen).fill(null);
    const freeWorkers = new Int32Array(poolLen);
    let freeWorkersHead = 0;

    const checkState = () => {
        if (capturedErrors.length > 0 || (signal && signal.aborted)) {
            aborted = true;
        }

        if (aborted) {
            while (freeWorkersHead > 0) {
                const w = freeWorkers[--freeWorkersHead];
                if (workerBlockedResolves[w]) {
                    workerBlockedResolves[w]!(-1);
                    workerBlockedResolves[w] = null;
                }
            }
            if (writerWaiterResolve) {
                const res = writerWaiterResolve;
                writerWaiterResolve = null;
                res();
            }
            return;
        }

        // See if we can assign tasks to waiting workers
        while (freeWorkersHead > 0 && nextFrameToSubmit < totalFrames && nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth) {
            const w = freeWorkers[--freeWorkersHead];
            const res = workerBlockedResolves[w]!;
            workerBlockedResolves[w] = null;

            const i = nextFrameToSubmit++;
            const ringIndex = i & ringMask;

            frameReadyRing[ringIndex] = 0;
            frameBufferRing[ringIndex] = null;

            res(i);
        }

        // If we still have waiting workers but are at totalFrames, tell them to stop
        if (nextFrameToSubmit >= totalFrames) {
            while (freeWorkersHead > 0) {
                const w = freeWorkers[--freeWorkersHead];
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
            freeWorkers[freeWorkersHead++] = w;
            checkState();
        };
    }

    const runWorker = async (worker: WorkerInfo, workerIndex: number) => {
        const { timeDriver, strategy, page } = worker;

        while (!aborted) {
            let i: number;
            if (aborted || nextFrameToSubmit >= totalFrames) {
                i = -1;
            } else if (nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth) {
                i = nextFrameToSubmit++;
                const ringIndex = i & ringMask;

                frameReadyRing[ringIndex] = 0;
                frameBufferRing[ringIndex] = null;
            } else {
                i = await new Promise<number>(workerBlockedExecutors[workerIndex]);
            }

            if (i === -1) break;

            const time = i * timeStep;
            const compositionTimeInSeconds = (startFrame + i) * compTimeStep;

            const ringIndex = i & ringMask;

            const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
            try {
                const buffer = setTimeResult
                    ? await setTimeResult.then(() => strategy.capture(page, time))
                    : await strategy.capture(page, time);
                frameBufferRing[ringIndex] = buffer;
                frameReadyRing[ringIndex] = 1;
            } catch (e) {
                fatalError = e;
                aborted = true;
                checkState();
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
        while (nextFrameToWrite < totalFrames && !aborted) {
            if (freeWorkersHead > 0 || capturedErrors.length > 0 || (signal && signal.aborted)) {
                checkState();
            }
            if (aborted) break;

            const ringIndex = nextFrameToWrite & ringMask;
            if (frameReadyRing[ringIndex] === 0) {
                await new Promise<void>(writerWaiterExecutor);
                continue;
            }

            const buffer = frameBufferRing[ringIndex]!;

            const currentFrame = nextFrameToWrite;

            if (currentFrame === nextProgressFrame) {
                console.log(`Progress: Rendered ${currentFrame} / ${totalFrames} frames`);
                nextProgressFrame += progressInterval;
            }

            if (onProgress) {
                onProgress(currentFrame / totalFrames);
            }

            if (previousWritePromise) {
                await previousWritePromise;
                previousWritePromise = undefined;
            }

            if (stdin?.writable) {
                let canWriteMore: boolean;
                if (typeof buffer === 'string') {
                    canWriteMore = stdin.write(buffer, 'base64');
                } else {
                    canWriteMore = stdin.write(buffer);
                }

                if (!canWriteMore) {
                    previousWritePromise = new Promise<void>(this.drainPromiseExecutor);
                }
            } else {
                console.warn('FFmpeg stdin is not writable. Skipping write.');
            }

            nextFrameToWrite++;
        }
    } catch (e) {
        aborted = true;
        checkState();
        throw e;
    }

    aborted = true;
    checkState();

    if (fatalError) throw fatalError;
    if (capturedErrors.length > 0) {
        throw capturedErrors[0];
    }
    if (signal && signal.aborted) {
        throw new Error('Aborted');
    }

    await Promise.all(workerPromises);

    if (previousWritePromise) {
        await previousWritePromise;
    }
    }

    console.log('Finishing render strategy...');
    const finalBuffer = await this.pool[0].strategy.finish(this.pool[0].page);
    if (finalBuffer && ((Buffer.isBuffer(finalBuffer) && finalBuffer.length > 0) || (typeof finalBuffer === 'string' && finalBuffer.length > 0))) {
      console.log(`Writing final buffer...`);
      if (stdin?.writable) {
          let canWriteMore: boolean;
          if (typeof finalBuffer === 'string') {
              canWriteMore = stdin.write(finalBuffer, 'base64');
          } else {
              canWriteMore = stdin.write(finalBuffer);
          }
          if (!canWriteMore) {
              await new Promise<void>(this.drainPromiseExecutor);
          }
      } else {
          console.warn('FFmpeg stdin is not writable. Skipping write.');
      }
    }

    console.log('Finished sending frames. Closing FFmpeg stdin.');
    stdin?.end();
  }

}
