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



      try {

        let nextProgress = progressInterval + 1;

        let nextCapturePromise: any = null;
        if (isDomStrategy) {
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

          const buf = Buffer.from(rawResult as string, "base64");

          pendingBytes += buf.length;
          if (!stream.write(buf) && pendingBytes >= MAX_PENDING_BYTES) {
            await this.drainPromise;
            pendingBytes = 0;
          }
        } else {
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
        }

        let i = 1;
        const loopEnd = totalFrames - 1;
        if (isDomStrategy) {
          while (i < loopEnd && !aborted) {
            const chunkEnd = Math.min(nextProgress, loopEnd);

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

              const buf = Buffer.from(rawResult as string, "base64");

              pendingBytes += buf.length;
              if (!stream.write(buf) && pendingBytes >= MAX_PENDING_BYTES) {
                await this.drainPromise;
                pendingBytes = 0;
              }
            }

            if (aborted) break;

            if (i === nextProgress) {
              nextProgress += progressInterval;
              console.log(
                `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
              );
              if (onProgress) {
                onProgress((i - 1) / totalFrames);
              }
            }
          }
        } else {
          while (i < loopEnd && !aborted) {
            const chunkEnd = Math.min(nextProgress, loopEnd);

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

            if (i === nextProgress) {
              nextProgress += progressInterval;
              console.log(
                `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
              );
              if (onProgress) {
                onProgress((i - 1) / totalFrames);
              }
            }
          }
        }

        if (!aborted && totalFrames > 1) {
          if (isDomStrategy) {
            try {
              const rawResult = await nextCapturePromise;

              const buf = Buffer.from(rawResult as string, "base64");

              pendingBytes += buf.length;
              if (!stream.write(buf) && pendingBytes >= MAX_PENDING_BYTES) {
                await this.drainPromise;
                pendingBytes = 0;
              }

              i++;
              if (i === nextProgress || i === totalFrames) {
                if (i === nextProgress) nextProgress += progressInterval;
                console.log(
                  `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
                );
                if (onProgress) {
                  onProgress((i - 1) / totalFrames);
                }
              }
            } catch (e) {
              if (!aborted) throw e;
            }
          } else {
            try {
              const rawResult = await nextCapturePromise;

              pendingBytes += rawResult.length;
              if (!stream.write(rawResult) && pendingBytes >= MAX_PENDING_BYTES) {
                await this.drainPromise;
                pendingBytes = 0;
              }

              i++;
              if (i === nextProgress || i === totalFrames) {
                if (i === nextProgress) nextProgress += progressInterval;
                console.log(
                  `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
                );
                if (onProgress) {
                  onProgress((i - 1) / totalFrames);
                }
              }
            } catch (e) {
              if (!aborted) throw e;
            }
          }
        }

      } catch (e) {
        fatalError = e;
      } finally {
        if (signal && abortListener) {
          signal.removeEventListener("abort", abortListener);
        }
      }

      if (fatalError) throw fatalError;
      if (capturedErrors.length > 0) throw capturedErrors[0];
      if (signal && signal.aborted) throw new Error("Aborted");
    } else {
      let maxPipelineDepth = 64;
      maxPipelineDepth = Math.pow(2, Math.ceil(Math.log2(maxPipelineDepth)));
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
            head--;
            const w = freeWorkers[head];
            workerThenables[w].resolve(-1);
          }
          freeWorkersHead = 0;
          writerWaiterPromise.resolve();
          return;
        }

        // See if we can assign tasks to waiting workers
        if (freeWorkersHead !== 0) {
                  let dispatches = (nextFrameToWrite + maxPipelineDepth < totalFrames ? nextFrameToWrite + maxPipelineDepth : totalFrames) - nextFrameToSubmit;
                  if (dispatches > 0) {
                    let h = freeWorkersHead;
                    let n = nextFrameToSubmit;
                    const targetH = h - (dispatches < h ? dispatches : h);
                    do {
                      h--;
                      workerThenables[freeWorkers[h]].resolve(n);
                      n++;
                    } while (h !== targetH);
                    freeWorkersHead = targetH;
                    nextFrameToSubmit = n;
                  }

          let n = nextFrameToSubmit;
          let h = freeWorkersHead;
          // If we still have waiting workers but are at totalFrames, tell them to stop
          if (n === totalFrames) {
            while (h !== 0) {
              h--;
              workerThenables[freeWorkers[h]].resolve(-1);
            }
            h = 0;
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

      const runWorker = async (worker: WorkerInfo, workerIndex: number) => {
        const { timeDriver, strategy, page } = worker;
        const isDomStrategy = !!(strategy as any).beginFrameParams;

        while (nextFrameToSubmit !== totalFrames && !aborted) {
          let i: number;
          if (nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth) {
            i = nextFrameToSubmit++;
          } else {
            freeWorkers[freeWorkersHead++] = workerIndex;
            i = (await workerThenables[workerIndex]) as any as number;
          }

          if (i === -1) break;

          try {
            const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
            if (timePromise) {
              await timePromise;
            }

            if (isDomStrategy) {
              const rawResult = await strategy.capture(page, i * timeStep);
              let buf: Buffer = Buffer.from(rawResult as string, "base64");
              frameBufferRing[i & ringMask] = buf;
            } else {
              frameBufferRing[i & ringMask] = await strategy.capture(page, i * timeStep);
            }
          } catch (e) {
            fatalError = e;
            aborted = true;
            checkState();
          }
          writerWaiterPromise.resolve();
        }
      };

      const workerPromises = this.pool.map((w, i) => runWorker(w, i));
      const stream = stdin!;
      let pendingBytes = 0;


      try {
        let nextProgress = progressInterval;
        if (nextFrameToWrite < totalFrames && !aborted) {
          while (nextFrameToWrite !== totalFrames && !aborted) {
            const chunkEnd = Math.min(nextProgress, totalFrames);

            if (freeWorkersHead !== 0) {
              let dispatches = (nextFrameToWrite + maxPipelineDepth < totalFrames ? nextFrameToWrite + maxPipelineDepth : totalFrames) - nextFrameToSubmit;
              if (dispatches > 0) {
                let h = freeWorkersHead;
                let n = nextFrameToSubmit;
                const targetH = h - (dispatches < h ? dispatches : h);
                do {
                  h--;
                  workerThenables[freeWorkers[h]].resolve(n);
                  n++;
                } while (h !== targetH);
                freeWorkersHead = targetH;
                nextFrameToSubmit = n;
              }

              let n = nextFrameToSubmit;
              let h = freeWorkersHead;
              if (n === totalFrames) {
                while (h !== 0) {
                  h--;
                  workerThenables[freeWorkers[h]].resolve(-1);
                }
                h = 0;
              }
              freeWorkersHead = h;
            }

            while (nextFrameToWrite !== chunkEnd) {
              const ringIndex = nextFrameToWrite & ringMask;
              if (frameBufferRing[ringIndex] === null) {
                break;
              }

              const buffer = frameBufferRing[ringIndex] as unknown as Buffer;
              frameBufferRing[ringIndex] = null;
              pendingBytes += buffer.length;
              if (!stream.write(buffer) && pendingBytes >= MAX_PENDING_BYTES) {
                await this.drainPromise;
                pendingBytes = 0;
              }

              nextFrameToWrite++;
            }

            if (aborted) break;
            if (nextFrameToWrite !== chunkEnd) {
              const awaitIndex = nextFrameToWrite & ringMask;
              if (frameBufferRing[awaitIndex] === null) {
                do {
                  await writerWaiterPromise;
                } while (frameBufferRing[awaitIndex] === null && !aborted);
                if (aborted) break;
              }
            }

            if (nextFrameToWrite === nextProgress) {
              nextProgress += progressInterval;
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
