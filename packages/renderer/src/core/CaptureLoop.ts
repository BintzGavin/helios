import { WorkerInfo } from "./BrowserPool.js";
import { FFmpegManager } from "./FFmpegManager.js";
import { RendererOptions, RenderJobOptions } from "../types.js";

const MAX_PENDING_BYTES = 16777216;

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
    private jobOptions?: RenderJobOptions,
  ) {}

  private setupDrainListeners() {
    if (!this.ffmpegManager.stdin) return;
    this.ffmpegManager.stdin.on("drain", () => {
      this.drainPromise.resolve();
    });
    this.ffmpegManager.stdin.on("error", (err) => {
      if (err && (err as any).code === "EPIPE") {
        console.warn(
          "FFmpeg stdin closed prematurely (EPIPE). Ignoring error to allow graceful exit.",
        );
        this.drainPromise.resolve();
      } else {
        if (this.drainPromise.rejectCb) {
          this.drainPromise.reject(err);
        } else {
          this.ffmpegManager.emitError(err);
        }
      }
    });
    this.ffmpegManager.stdin.on("close", () => {
      if (this.drainPromise.rejectCb) {
        this.drainPromise.reject(new Error("FFmpeg stdin closed before drain"));
      }
    });
  }

  public async run(): Promise<void> {
    if (this.totalFrames <= 0) return;
    this.setupDrainListeners();
    const fps = this.options.fps;
    const totalFrames = this.totalFrames;
    const startFrame = this.startFrame;
    const capturedErrors = this.capturedErrors;
    const stdin = this.ffmpegManager.stdin;

    let progressInterval = Math.floor(totalFrames / 10);
    if (progressInterval < 1) progressInterval = 1;

    const timeStep = 1000 / fps;
    const compTimeStep = 1 / fps;
    const poolLen = this.pool.length;

    const isDomStrategy = this.pool[0].strategy.constructor.name === 'DomStrategy';

    // FAST PATH FOR SINGLE WORKER
    if (poolLen === 1) {
      const worker = this.pool[0];
      const { timeDriver, strategy, page } = worker;
      let fatalError: any = null;

      const signal = this.jobOptions?.signal;
      const onProgress = this.jobOptions?.onProgress;

      const stream = stdin!;
      let pendingBytes = 0;

      let aborted = false;
      let abortListener: (() => void) | null = null;
      if (signal) {
        if (signal.aborted) aborted = true;
        abortListener = () => {
          aborted = true;
        };
        signal.addEventListener("abort", abortListener);
      }

      // A standard 1080p frame is ~300KB to 2MB in base64. A 600x600 canvas frame base64 decode needs ~200KB.
      // We pre-allocate with a conservative 512KB to cover most initial frame dimensions without realloc.


      const isDomStrategy = !!(strategy as any).cdpSession;

      if (isDomStrategy) {
        try {

          let nextCapturePromise: any = null;
          timeDriver.setTime(
            page,
            startFrame * compTimeStep,
          );
          nextCapturePromise = strategy.capture(page, 0);

          const rawResult = await nextCapturePromise;
          if (1 < totalFrames) {
            timeDriver.setTime(
              page,
              (startFrame + 1) * compTimeStep,
            );
            nextCapturePromise = strategy.capture(page, timeStep);
          }
          console.log(`Progress: Rendered 0 / ${totalFrames} frames`);
          if (onProgress) {
            onProgress(0 / totalFrames);
          }

          pendingBytes += ((rawResult as string).length * 3) >>> 2;
          if (!stream.write(rawResult as string, "base64") && pendingBytes >= MAX_PENDING_BYTES) {
            await this.drainPromise;
            pendingBytes = 0;
          }

          let i = 1;
          const loopEnd = totalFrames - 1;
          while (i < loopEnd && !aborted) {
            const chunkEnd = Math.min(i + progressInterval, loopEnd);

            for (; i !== chunkEnd; i++) {
              const rawResult = await nextCapturePromise;

              timeDriver.setTime(
                page,
                (startFrame + i + 1) * compTimeStep,
              );

              if (!aborted) {
                nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
              }

              pendingBytes += ((rawResult as string).length * 3) >>> 2;
              if (!stream.write(rawResult as string, "base64") && pendingBytes >= MAX_PENDING_BYTES) {
                await this.drainPromise;
                pendingBytes = 0;
              }
            }

            if (aborted) break;

            if (i !== loopEnd) {
              console.log(
                `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
              );
              if (onProgress) {
                onProgress((i - 1) / totalFrames);
              }
            }
          }

          if (!aborted && totalFrames > 1) {
            const rawResult = await nextCapturePromise;

            pendingBytes += ((rawResult as string).length * 3) >>> 2;
            if (!stream.write(rawResult as string, "base64") && pendingBytes >= MAX_PENDING_BYTES) {
              await this.drainPromise;
              pendingBytes = 0;
            }

            i++;
            console.log(
              `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
            );
            if (onProgress) {
              onProgress((i - 1) / totalFrames);
            }
          }

        } catch (e) {
          fatalError = e;
        } finally {
          if (signal && abortListener) {
            signal.removeEventListener("abort", abortListener);
          }
        }
      } else {
        try {

          let nextCapturePromise: any = null;
          const timePromise = timeDriver.setTime(
            page,
            startFrame * compTimeStep,
          );
          if (timePromise) await timePromise;
          nextCapturePromise = strategy.capture(page, 0);

          const rawResult = await nextCapturePromise;
          if (1 < totalFrames) {
            const timePromise = timeDriver.setTime(
              page,
              (startFrame + 1) * compTimeStep,
            );
            if (timePromise) await timePromise;
            nextCapturePromise = strategy.capture(page, timeStep);
          }
          console.log(`Progress: Rendered 0 / ${totalFrames} frames`);
          if (onProgress) {
            onProgress(0 / totalFrames);
          }

          pendingBytes += rawResult.length;
          if (!stream.write(rawResult) && pendingBytes >= MAX_PENDING_BYTES) {
            await this.drainPromise;
            pendingBytes = 0;
          }

          let i = 1;
          const loopEnd = totalFrames - 1;
          while (i < loopEnd && !aborted) {
            const chunkEnd = Math.min(i + progressInterval, loopEnd);

            for (; i !== chunkEnd; i++) {
              const rawResult = await nextCapturePromise;

              const timePromise = timeDriver.setTime(
                page,
                (startFrame + i + 1) * compTimeStep,
              );
              if (timePromise) await timePromise;

              if (!aborted) {
                nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
              }

              const buf = rawResult;

              pendingBytes += buf.length;
              if (!stream.write(buf) && pendingBytes >= MAX_PENDING_BYTES) {
                await this.drainPromise;
                pendingBytes = 0;
              }
            }

            if (aborted) break;

            if (i !== loopEnd) {
              console.log(
                `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
              );
              if (onProgress) {
                onProgress((i - 1) / totalFrames);
              }
            }
          }

          if (!aborted && totalFrames > 1) {
            const rawResult = await nextCapturePromise;

            pendingBytes += rawResult.length;
            if (!stream.write(rawResult) && pendingBytes >= MAX_PENDING_BYTES) {
              await this.drainPromise;
              pendingBytes = 0;
            }

            i++;
            console.log(
              `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
            );
            if (onProgress) {
              onProgress((i - 1) / totalFrames);
            }
          }

        } catch (e) {
          fatalError = e;
        } finally {
          if (signal && abortListener) {
            signal.removeEventListener("abort", abortListener);
          }
        }
      }


      if (fatalError) throw fatalError;
      if (capturedErrors.length > 0) throw capturedErrors[0];
      if (signal && signal.aborted) throw new Error("Aborted");
    } else {
      const maxPipelineDepth = 64;
      const ringMask = maxPipelineDepth - 1;
      const timeStep = 1000 / fps;
      const compTimeStep = 1 / fps;
      const signal = this.jobOptions?.signal;
      const onProgress = this.jobOptions?.onProgress;

      const frameBufferRing = new Array<Buffer | string | null>(
        maxPipelineDepth,
      ).fill(null);
      let fatalError: any = null;


      const writerWaiterPromise = new ReusableThenable();

      // Multi-worker ACTOR MODEL with backpressure
      let nextFrameToSubmit = 0;
      let nextFrameToWrite = 0;
      let aborted = false;
      const workerThenables = new Array<ReusableNumberThenable>(poolLen);
      for (let i = 0; i < poolLen; i++)
        workerThenables[i] = new ReusableNumberThenable();
      const freeWorkers = new Int32Array(poolLen);
      let freeWorkersHead = 0;

      const checkState = () => {
        if (capturedErrors.length > 0 || (signal && signal.aborted)) {
          aborted = true;
        }

        if (aborted) {
          let head = freeWorkersHead;
          while (head !== 0) {
            workerThenables[freeWorkers[--head]].resolve(-1);
          }
          freeWorkersHead = 0;
          writerWaiterPromise.resolve();
          return;
        }

        // See if we can assign tasks to waiting workers
        dispatchWorkers();
      };

      const dispatchWorkers = () => {
        if (freeWorkersHead !== 0) {
          let h = freeWorkersHead;
          let n = nextFrameToSubmit;

          let dispatches = Math.min(nextFrameToWrite + maxPipelineDepth, totalFrames) - n;

          if (dispatches > 0) {
            const targetH = Math.max(h - dispatches, 0);
            do {
              workerThenables[freeWorkers[--h]].resolve(n++);
            } while (h !== targetH);
          }

          // If we still have waiting workers but are at totalFrames, tell them to stop
          if (n === totalFrames) {
            while (h !== 0) {
              workerThenables[freeWorkers[--h]].resolve(-1);
            }
          }

          freeWorkersHead = h;
          nextFrameToSubmit = n;
        }
      };

      let abortListener: (() => void) | null = null;
      if (signal) {
        if (signal.aborted) {
          aborted = true;
          checkState();
        }
        abortListener = () => {
          aborted = true;
          checkState();
        };
        signal.addEventListener("abort", abortListener);
      }

      const runWorker = isDomStrategy
        ? async (worker: WorkerInfo, workerIndex: number) => {
            const { timeDriver, strategy, page } = worker;
            try {
              while (nextFrameToSubmit !== totalFrames && !aborted) {
                let i: number;
                if (nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth) {
                  i = nextFrameToSubmit++;
                } else {
                  freeWorkers[freeWorkersHead++] = workerIndex;
                  i = (await workerThenables[workerIndex]) as any as number;
                }

                if (i === -1) break;

                timeDriver.setTime(page, (startFrame + i) * compTimeStep);

                frameBufferRing[i & ringMask] = (await strategy.capture(page, i * timeStep)) as string;
                if (i === nextFrameToWrite) writerWaiterPromise.resolve();
              }
            } catch (e) {
              fatalError = e;
              aborted = true;
              checkState();
            }
          }
        : async (worker: WorkerInfo, workerIndex: number) => {
            const { timeDriver, strategy, page } = worker;
            try {
              while (nextFrameToSubmit !== totalFrames && !aborted) {
                let i: number;
                if (nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth) {
                  i = nextFrameToSubmit++;
                } else {
                  freeWorkers[freeWorkersHead++] = workerIndex;
                  i = (await workerThenables[workerIndex]) as any as number;
                }

                if (i === -1) break;

                const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
                if (timePromise) await timePromise;

                frameBufferRing[i & ringMask] = await strategy.capture(page, i * timeStep);
                if (i === nextFrameToWrite) writerWaiterPromise.resolve();
              }
            } catch (e) {
              fatalError = e;
              aborted = true;
              checkState();
            }
          };

      const workerPromises = this.pool.map((w, i) => runWorker(w, i));
      const stream = stdin!;
      let pendingBytes = 0;


      try {
        let progressCounter = progressInterval;
        if (nextFrameToWrite < totalFrames && !aborted) {
          while (nextFrameToWrite !== totalFrames && !aborted) {
            const chunkEnd = Math.min(nextFrameToWrite + progressCounter, totalFrames);
            const startWrite = nextFrameToWrite;

            dispatchWorkers();

            if (isDomStrategy) {
              while (nextFrameToWrite !== chunkEnd) {
                const ringIndex = nextFrameToWrite & ringMask;
                const buffer = frameBufferRing[ringIndex] as string | null;
                if (buffer === null) {
                  break;
                }

                frameBufferRing[ringIndex] = null;
                pendingBytes += (buffer.length * 3) >>> 2;
                if (!stream.write(buffer, "base64") && pendingBytes >= MAX_PENDING_BYTES) {
                  await this.drainPromise;
                  pendingBytes = 0;
                }

                nextFrameToWrite++;
              }
            } else {
              while (nextFrameToWrite !== chunkEnd) {
                const ringIndex = nextFrameToWrite & ringMask;
                const buffer = frameBufferRing[ringIndex] as Buffer | null;
                if (buffer === null) {
                  break;
                }

                frameBufferRing[ringIndex] = null;
                pendingBytes += buffer.length;
                if (!stream.write(buffer) && pendingBytes >= MAX_PENDING_BYTES) {
                  await this.drainPromise;
                  pendingBytes = 0;
                }

                nextFrameToWrite++;
              }
            }

            const isProgress = !(progressCounter -= nextFrameToWrite - startWrite);

            if (aborted) break;
            if (nextFrameToWrite !== chunkEnd) {

              while (frameBufferRing[nextFrameToWrite & ringMask] === null && !aborted) {
                await writerWaiterPromise;
              }
              if (aborted) break;
            }

            if (isProgress) {
              progressCounter = progressInterval;
              console.log(
                `Progress: Rendered ${nextFrameToWrite} / ${totalFrames} frames`,
              );
              if (onProgress) onProgress(nextFrameToWrite / totalFrames);
            }
          }
        }
      } catch (e) {
        aborted = true;
        checkState();
        throw e;
      } finally {
        if (signal && abortListener) {
          signal.removeEventListener("abort", abortListener);
        }
      }

      aborted = true;
      checkState();

      if (fatalError) throw fatalError;
      if (capturedErrors.length > 0) {
        throw capturedErrors[0];
      }
      if (signal && signal.aborted) {
        throw new Error("Aborted");
      }

      await Promise.all(workerPromises);
    }

    console.log("Finishing render strategy...");
    const finalBuffer = await this.pool[0].strategy.finish(this.pool[0].page);
    if (finalBuffer && finalBuffer.length > 0) {
      console.log(`Writing final buffer...`);
      if (isDomStrategy) {
        if (!stdin!.write(finalBuffer as any, "base64")) {
          await this.drainPromise;
        }
      } else {
        if (!stdin!.write(finalBuffer as any)) {
          await this.drainPromise;
        }
      }
    }

    console.log("Finished sending frames. Closing FFmpeg stdin.");
    stdin?.end();
  }
}
