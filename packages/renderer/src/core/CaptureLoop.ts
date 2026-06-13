import { WorkerInfo } from './BrowserPool.js';
import { FFmpegManager } from './FFmpegManager.js';
import { RendererOptions, RenderJobOptions } from '../types.js';
import { RenderStrategy } from '../strategies/RenderStrategy.js';
import { TimeDriver } from '../drivers/TimeDriver.js';

const noopCatch = () => {};

class ReusableThenable {
  public resolveCb: (() => void) | null = null;
  public rejectCb: ((err: Error) => void) | null = null;

  then(resolve: () => void, reject: (err: Error) => void) {
    this.resolveCb = resolve;
    this.rejectCb = reject;
  }

  resolve() {
    if (this.resolveCb) {
      const cb = this.resolveCb;
      this.resolveCb = null;
      this.rejectCb = null;
      cb();
    }
  }

  reject(err: Error) {
    if (this.rejectCb) {
      const cb = this.rejectCb;
      this.resolveCb = null;
      this.rejectCb = null;
      cb(err);
    }
  }
}

class ReusableNumberThenable {
  public resolveCb: ((val: number) => void) | null = null;
  public rejectCb: ((err: Error) => void) | null = null;
  public isResolved: boolean = false;
  public isRejected: boolean = false;
  public resolvedValue: number = 0;
  public rejectedError: Error | null = null;

  then(resolve: (val: number) => void, reject: (err: Error) => void) {
    if (this.isResolved) {
      this.isResolved = false;
      resolve(this.resolvedValue);
    } else if (this.isRejected) {
      this.isRejected = false;
      reject(this.rejectedError!);
    } else {
      this.resolveCb = resolve;
      this.rejectCb = reject;
    }
  }

  resolve(val: number) {
    if (this.resolveCb) {
      const cb = this.resolveCb;
      this.resolveCb = null;
      this.rejectCb = null;
      cb(val);
    } else {
      this.isResolved = true;
      this.resolvedValue = val;
    }
  }

  reject(err: Error) {
    if (this.rejectCb) {
      const cb = this.rejectCb;
      this.resolveCb = null;
      this.rejectCb = null;
      cb(err);
    } else {
      this.isRejected = true;
      this.rejectedError = err;
    }
  }
}

export class CaptureLoop {
  private drainPromise = new ReusableThenable();

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
      this.drainPromise.resolve();
    });
    this.ffmpegManager.stdin.on('error', (err) => {
      if (err && (err as any).code === 'EPIPE') {
         console.warn('FFmpeg stdin closed prematurely (EPIPE). Ignoring error to allow graceful exit.');
         this.drainPromise.resolve();
      } else {
        if (this.drainPromise.rejectCb) {
          this.drainPromise.reject(err);
        } else {
          this.ffmpegManager.emitError(err);
        }
      }
    });
    this.ffmpegManager.stdin.on('close', () => {
      if (this.drainPromise.rejectCb) {
        this.drainPromise.reject(new Error('FFmpeg stdin closed before drain'));
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
        const hasProcessFn = !!strategy.processCaptureResult;
        try {
            for (let i = 0; i < totalFrames; i++) {
                if (capturedErrors.length > 0 || (signal && signal.aborted)) break;

                const time = i * timeStep;
                const compositionTimeInSeconds = (startFrame + i) * compTimeStep;

                await timeDriver.setTime(page, compositionTimeInSeconds);
                const rawResult = await strategy.capture(page, time);
                let buffer = hasProcessFn ? strategy.processCaptureResult!(rawResult) : rawResult;
                if (typeof buffer === 'string') {
                    buffer = Buffer.from(buffer, 'base64');
                }

                if (i === nextProgressFrame) {
                    console.log(`Progress: Rendered ${i} / ${totalFrames} frames`);
                    nextProgressFrame += progressInterval;
                }

                if (onProgress) {
                    onProgress(i / totalFrames);
                }


                if (stdin?.writable) {
                    const canWriteMore = stdin.write(buffer as any);

                    if (!canWriteMore && stdin.writableLength >= 16777216) {
                        await this.drainPromise;
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
    const writerWaiterPromise = new ReusableThenable();

    // Multi-worker ACTOR MODEL with backpressure
    let nextFrameToSubmit = 0;
    let nextFrameToWrite = 0;
    let aborted = false;
    const workerThenables = new Array<ReusableNumberThenable>(poolLen);
    for(let i=0;i<poolLen;i++) workerThenables[i] = new ReusableNumberThenable();
    const freeWorkers = new Int32Array(poolLen);
    let freeWorkersHead = 0;

    const checkState = () => {
        if (capturedErrors.length > 0 || (signal && signal.aborted)) {
            aborted = true;
        }

        if (aborted) {
            while (freeWorkersHead > 0) {
                const w = freeWorkers[--freeWorkersHead];
                workerThenables[w].resolve(-1);
            }
            writerWaiterPromise.resolve();
            return;
        }

        // See if we can assign tasks to waiting workers
        while (freeWorkersHead > 0 && nextFrameToSubmit < totalFrames && nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth) {
            const w = freeWorkers[--freeWorkersHead];
            const i = nextFrameToSubmit++;
            const ringIndex = i & ringMask;

            frameReadyRing[ringIndex] = 0;
            frameBufferRing[ringIndex] = null;

            workerThenables[w].resolve(i);
        }

        // If we still have waiting workers but are at totalFrames, tell them to stop
        if (nextFrameToSubmit >= totalFrames) {
            while (freeWorkersHead > 0) {
                const w = freeWorkers[--freeWorkersHead];
                workerThenables[w].resolve(-1);
            }
        }
    };




    const runWorker = async (worker: WorkerInfo, workerIndex: number) => {
        const { timeDriver, strategy, page } = worker;
        const hasProcessFn = !!strategy.processCaptureResult;

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
                freeWorkers[freeWorkersHead++] = workerIndex;
                checkState();
                i = (await workerThenables[workerIndex] as any) as number;
            }

            if (i === -1) break;

            const time = i * timeStep;
            const compositionTimeInSeconds = (startFrame + i) * compTimeStep;

            const ringIndex = i & ringMask;

            try {
                await timeDriver.setTime(page, compositionTimeInSeconds);
                const rawResult = await strategy.capture(page, time);
                let buffer = hasProcessFn ? strategy.processCaptureResult!(rawResult) : rawResult;
                if (typeof buffer === 'string') {
                    buffer = Buffer.from(buffer, 'base64');
                }
                frameBufferRing[ringIndex] = buffer;
                frameReadyRing[ringIndex] = 1;
            } catch (e) {
                fatalError = e;
                aborted = true;
                checkState();
            }
            writerWaiterPromise.resolve();
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
                await writerWaiterPromise;
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


            if (stdin?.writable) {
                    const canWriteMore = stdin.write(buffer as any);

                    if (!canWriteMore && stdin.writableLength >= 16777216) {
                    await this.drainPromise;
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

    }

    console.log('Finishing render strategy...');
    const finalBuffer = await this.pool[0].strategy.finish(this.pool[0].page);
    if (finalBuffer && ((Buffer.isBuffer(finalBuffer) && finalBuffer.length > 0) || (typeof finalBuffer === 'string' && finalBuffer.length > 0))) {
      console.log(`Writing final buffer...`);
      if (stdin?.writable) {
          const canWriteMore = stdin.write(finalBuffer as any);
          if (!canWriteMore) {
              await this.drainPromise;
          }
      } else {
          console.warn('FFmpeg stdin is not writable. Skipping write.');
      }
    }

    console.log('Finished sending frames. Closing FFmpeg stdin.');
    stdin?.end();
  }

}
