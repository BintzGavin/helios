import { WorkerInfo } from "./BrowserPool.js";
import { FFmpegManager } from "./FFmpegManager.js";
import { RendererOptions, RenderJobOptions } from "../types.js";
import { RenderStrategy } from "../strategies/RenderStrategy.js";
import { TimeDriver } from "../drivers/TimeDriver.js";

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

class PooledBuffer {
  public buffer: Buffer;
  public size: number;
  public freeCb: () => void;
  public next: PooledBuffer | null = null;
  constructor(size: number, poolObj: { head: PooledBuffer | null }) {
    this.buffer = Buffer.allocUnsafe(size);
    this.size = size;
    this.freeCb = () => {
      this.next = poolObj.head;
      poolObj.head = this;
    };
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

    // FAST PATH FOR SINGLE WORKER
    if (poolLen === 1) {
      const worker = this.pool[0];
      const { timeDriver, strategy, page } = worker;
      let fatalError: any = null;

      const signal = this.jobOptions?.signal;
      const onProgress = this.jobOptions?.onProgress;
      const hasProcessFn = !!strategy.processCaptureResult;
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
      const domCdpSession = isDomStrategy ? (strategy as any).cdpSession : null;
      const domBeginFrameParams = isDomStrategy
        ? (strategy as any).beginFrameParams
        : null;
      const domBeginFrame = isDomStrategy
        ? () => domCdpSession!.send("HeadlessExperimental.beginFrame", domBeginFrameParams)
        : null;
      let domLastFrameData: any = isDomStrategy
        ? (strategy as any).lastFrameData
        : null;
      let domLastFrameBuffer: Buffer | null = null;

      try {

        let nextProgress = progressInterval;
        if (hasProcessFn) {
          let nextCapturePromise = null;
          if (totalFrames > 0) {
            const timePromise = timeDriver.setTime(
              page,
              startFrame * compTimeStep,
            );
            if (isDomStrategy) {
              nextCapturePromise = domBeginFrame!();
            } else {
              if (timePromise) {
                await timePromise;
              }
              nextCapturePromise = strategy.capture(page, 0);
            }
          }

          if (totalFrames > 0) {
            const rawResult = await nextCapturePromise;
            if (1 < totalFrames) {
              const timePromise = timeDriver.setTime(
                page,
                (startFrame + 1) * compTimeStep,
              );
              if (isDomStrategy) {
                nextCapturePromise = domBeginFrame!();
              } else {
                if (timePromise) {
                  await timePromise;
                }
                nextCapturePromise = strategy.capture(page, timeStep);
              }
            }
            let buffer;
            if (isDomStrategy) {
              const data = (rawResult as any).screenshotData;
              if (data) {
                domLastFrameData = data;
              }
              buffer = domLastFrameData;
            } else {
              buffer = strategy.processCaptureResult!(rawResult);
            }
            console.log(`Progress: Rendered ${0} / ${totalFrames} frames`);
            if (onProgress) {
              onProgress(0 / totalFrames);
            }
            let writeSuccess = false;
            if (isDomStrategy) {
              if ((rawResult as any).screenshotData || !domLastFrameBuffer) {
                domLastFrameBuffer = Buffer.from(buffer as string, "base64");
              }
              const buf = domLastFrameBuffer;
              pendingBytes += buf.length;
              writeSuccess = stream.write(buf);
            } else {
              pendingBytes += (buffer as any).length;
              writeSuccess = stream.write(buffer as any);
            }

            if (!writeSuccess && pendingBytes >= 16777216) {
              await this.drainPromise;
              pendingBytes = 0;
            }

            if (isDomStrategy) {

                let i = 1;
                while (i < totalFrames - 1 && !aborted) {
                  const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);


                  for (; i < chunkEnd; i++) {
                    const rawResult = await nextCapturePromise;

                    timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );
                    nextCapturePromise = domBeginFrame!();

                    const data = rawResult.screenshotData;
                    let buf: Buffer;
                    if (data) {
                      domLastFrameData = data;
                      buf = Buffer.from(data as string, "base64");
                      domLastFrameBuffer = buf;
                    } else {
                      buf = domLastFrameBuffer!;
                    }

                    pendingBytes += buf.length;
                    const writeSuccessStr = stream.write(buf);

                    if (!writeSuccessStr && pendingBytes >= 16777216) {
                      await this.drainPromise;
                      pendingBytes = 0;
                    }
                  }

                  if (aborted) break;

                  if (i - 1 === nextProgress) {
                    nextProgress += progressInterval;
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

                  const data = rawResult.screenshotData;
                  let buf: Buffer;
                  if (data) {
                    domLastFrameData = data;
                    buf = Buffer.from(data as string, "base64");
                    domLastFrameBuffer = buf;
                  } else {
                    buf = domLastFrameBuffer!;
                  }

                  pendingBytes += buf.length;
                  const writeSuccessStr = stream.write(buf);

                  if (!writeSuccessStr && pendingBytes >= 16777216) {
                    await this.drainPromise;
                    pendingBytes = 0;
                  }

                  i++;
                  if (i - 1 === nextProgress || i === totalFrames) {
                    if (i - 1 === nextProgress) nextProgress += progressInterval;
                    console.log(
                      `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
                    );
                    if (onProgress) {
                      onProgress((i - 1) / totalFrames);
                    }
                  }
                }
            } else {

                let i = 1;
                while (i < totalFrames - 1 && !aborted) {
                  const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);


                  for (; i < chunkEnd; i++) {
                    const rawResult = await nextCapturePromise;

                    const timePromise = timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );

                    let buf;
                    buf = strategy.processCaptureResult!(rawResult);
                    pendingBytes += (buf as any).length;
                    const writeSuccessBuf = stream.write(buf as any);

                    if (timePromise) await timePromise;
                    nextCapturePromise = strategy.capture(
                      page,
                      (i + 1) * timeStep,
                    );

                    if (!writeSuccessBuf && pendingBytes >= 16777216) {
                      await this.drainPromise;
                      pendingBytes = 0;
                    }
                  }

                  if (aborted) break;

                  if (i - 1 === nextProgress) {
                    nextProgress += progressInterval;
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

                  let buf;
                  buf = strategy.processCaptureResult!(rawResult);
                  pendingBytes += (buf as any).length;
                  const writeSuccessBuf = stream.write(buf as any);

                  if (!writeSuccessBuf && pendingBytes >= 16777216) {
                    await this.drainPromise;
                    pendingBytes = 0;
                  }

                  i++;
                  if (i - 1 === nextProgress || i === totalFrames) {
                    if (i - 1 === nextProgress) nextProgress += progressInterval;
                    console.log(
                      `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
                    );
                    if (onProgress) {
                      onProgress((i - 1) / totalFrames);
                    }
                  }
                }
            }
          }
        } else {
          let nextCapturePromise = null;
          if (totalFrames > 0) {
            const timePromise = timeDriver.setTime(
              page,
              startFrame * compTimeStep,
            );
            if (isDomStrategy) {
              nextCapturePromise = domBeginFrame!();
            } else {
              if (timePromise) {
                await timePromise;
              }
              nextCapturePromise = strategy.capture(page, 0);
            }
          }

          if (totalFrames > 0) {
            const bufRaw = await nextCapturePromise;
            if (1 < totalFrames) {
              const timePromise = timeDriver.setTime(
                page,
                (startFrame + 1) * compTimeStep,
              );
              if (isDomStrategy) {
                nextCapturePromise = domBeginFrame!();
              } else {
                if (timePromise) {
                  await timePromise;
                }
                nextCapturePromise = strategy.capture(page, timeStep);
              }
            }
            console.log(`Progress: Rendered ${0} / ${totalFrames} frames`);
            if (onProgress) {
              onProgress(0 / totalFrames);
            }
            const buffer = bufRaw;
            let writeSuccess = false;
            if (isDomStrategy) {
              const data = (bufRaw as any).screenshotData;
              if (data) {
                domLastFrameData = data;
                domLastFrameBuffer = Buffer.from(data as string, "base64");
              } else if (!domLastFrameBuffer) {
                domLastFrameBuffer = Buffer.from(buffer as string, "base64");
              }
              const buf = domLastFrameBuffer!;
              pendingBytes += buf.length;
              writeSuccess = stream.write(buf);
            } else {
              pendingBytes += (buffer as any).length;
              writeSuccess = stream.write(buffer as any);
            }

            if (!writeSuccess && pendingBytes >= 16777216) {
              await this.drainPromise;
              pendingBytes = 0;
            }

            if (isDomStrategy) {

                let i = 1;
                while (i < totalFrames - 1 && !aborted) {
                  const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);


                  for (; i < chunkEnd; i++) {
                    const rawResult = await nextCapturePromise;

                    timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );
                    nextCapturePromise = domBeginFrame!();

                    const data = (rawResult as any).screenshotData;
                    let buf: Buffer;
                    if (data) {
                      domLastFrameData = data;
                      buf = Buffer.from(data as string, "base64");
                      domLastFrameBuffer = buf;
                    } else {
                      buf = domLastFrameBuffer!;
                    }

                    pendingBytes += buf.length;
                    const writeSuccessStr = stream.write(buf);

                    if (!writeSuccessStr && pendingBytes >= 16777216) {
                      await this.drainPromise;
                      pendingBytes = 0;
                    }
                  }

                  if (aborted) break;

                  if (i - 1 === nextProgress) {
                    nextProgress += progressInterval;
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

                  const data = (rawResult as any).screenshotData;
                  let buf: Buffer;
                  if (data) {
                    domLastFrameData = data;
                    buf = Buffer.from(data as string, "base64");
                    domLastFrameBuffer = buf;
                  } else {
                    buf = domLastFrameBuffer!;
                  }

                  pendingBytes += buf.length;
                  const writeSuccessStr = stream.write(buf);

                  if (!writeSuccessStr && pendingBytes >= 16777216) {
                    await this.drainPromise;
                    pendingBytes = 0;
                  }

                  i++;
                  if (i - 1 === nextProgress || i === totalFrames) {
                    if (i - 1 === nextProgress) nextProgress += progressInterval;
                    console.log(
                      `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
                    );
                    if (onProgress) {
                      onProgress((i - 1) / totalFrames);
                    }
                  }
                }
            } else {

                let i = 1;
                while (i < totalFrames - 1 && !aborted) {
                  const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);


                  for (; i < chunkEnd; i++) {
                    const buf = await nextCapturePromise;

                    const timePromise = timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );

                    pendingBytes += (buf as any).length;
                    const writeSuccessBuf = stream.write(buf as any);

                    if (timePromise) await timePromise;

                    nextCapturePromise = strategy.capture(
                      page,
                      (i + 1) * timeStep,
                    );

                    if (!writeSuccessBuf && pendingBytes >= 16777216) {
                      await this.drainPromise;
                      pendingBytes = 0;
                    }
                  }

                  if (aborted) break;

                  if (i - 1 === nextProgress) {
                    nextProgress += progressInterval;
                    console.log(
                      `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
                    );
                    if (onProgress) {
                      onProgress((i - 1) / totalFrames);
                    }
                  }
                }

                if (!aborted && totalFrames > 1) {
                  const buf = await nextCapturePromise;

                  pendingBytes += (buf as any).length;
                  const writeSuccessBuf = stream.write(buf as any);

                  if (!writeSuccessBuf && pendingBytes >= 16777216) {
                    await this.drainPromise;
                    pendingBytes = 0;
                  }

                  i++;
                  if (i - 1 === nextProgress || i === totalFrames) {
                    if (i - 1 === nextProgress) nextProgress += progressInterval;
                    console.log(
                      `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
                    );
                    if (onProgress) {
                      onProgress((i - 1) / totalFrames);
                    }
                  }
                }
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
      const frameReadyRing = null; // removed in PERF-891 // 0 = not ready, 1 = ready
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
          while (freeWorkersHead > 0) {
            const w = freeWorkers[--freeWorkersHead];
            workerThenables[w].resolve(-1);
          }
          writerWaiterPromise.resolve();
          return;
        }

        // See if we can assign tasks to waiting workers
        const maxSubmits = nextFrameToWrite + maxPipelineDepth;
                  const limit = Math.min(maxSubmits, totalFrames);
                  let dispatches = limit - nextFrameToSubmit;
                  if (dispatches > 0) {
                    dispatches = Math.min(dispatches, freeWorkersHead);
                    for (let d = 0; d < dispatches; d++) {
                      freeWorkersHead--;
                      const w = freeWorkers[freeWorkersHead];
                      const i = nextFrameToSubmit;
                      nextFrameToSubmit++;
                      frameBufferRing[i & ringMask] = null;
                      workerThenables[w].resolve(i);
                    }
                  }

        // If we still have waiting workers but are at totalFrames, tell them to stop
        if (nextFrameToSubmit === totalFrames) {
          for (let j = 0; j < freeWorkersHead; j++) {
            const w = freeWorkers[j];
            workerThenables[w].resolve(-1);
          }
          freeWorkersHead = 0;
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
        const hasProcessFn = !!strategy.processCaptureResult;

        const isDomStrategy = !!(strategy as any).beginFrameParams;
        const domCdpSession = isDomStrategy
          ? (strategy as any).cdpSession
          : null;
        const domBeginFrameParams = isDomStrategy
          ? (strategy as any).beginFrameParams
          : null;
        const domBeginFrame = isDomStrategy
          ? () => domCdpSession!.send("HeadlessExperimental.beginFrame", domBeginFrameParams)
          : null;
        let domLastFrameData: any = isDomStrategy
          ? (strategy as any).lastFrameData
          : null;
        let domLastFrameBuffer: Buffer | null = null;

        if (hasProcessFn) {
            let maxSubmits = nextFrameToWrite + maxPipelineDepth;
            while (!aborted && nextFrameToSubmit < totalFrames) {
              let i: number;
              if (nextFrameToSubmit < maxSubmits) {
                i = nextFrameToSubmit++;
                const ringIndex = i & ringMask;

                frameBufferRing[ringIndex] = null;
              } else {
                freeWorkers[freeWorkersHead++] = workerIndex;
                i = (await workerThenables[workerIndex]) as any as number;
                maxSubmits = nextFrameToWrite + maxPipelineDepth;
              }

              if (i === -1) break;

              const ringIndex = i & ringMask;

              try {
                const timePromise = timeDriver.setTime(
                  page,
                  (startFrame + i) * compTimeStep,
                );
                if (timePromise) {
                  await timePromise;
                }
                let buffer: any;
                buffer = strategy.processCaptureResult!(
                  await strategy.capture(page, i * timeStep),
                );
                frameBufferRing[ringIndex] = buffer;

              } catch (e) {
                fatalError = e;
                aborted = true;
                checkState();
              }
              writerWaiterPromise.resolve();
            }
        } else {
          if (isDomStrategy) {
            let maxSubmits = nextFrameToWrite + maxPipelineDepth;
            while (!aborted && nextFrameToSubmit < totalFrames) {
              let i: number;
              if (nextFrameToSubmit < maxSubmits) {
                i = nextFrameToSubmit++;
                const ringIndex = i & ringMask;

                frameBufferRing[ringIndex] = null;
              } else {
                freeWorkers[freeWorkersHead++] = workerIndex;
                i = (await workerThenables[workerIndex]) as any as number;
                maxSubmits = nextFrameToWrite + maxPipelineDepth;
              }

              if (i === -1) break;

              const ringIndex = i & ringMask;

              try {
                timeDriver.setTime(
                  page,
                  (startFrame + i) * compTimeStep,
                );
                let buffer: any;
                const rawResult = await domBeginFrame!();
                const data = (rawResult as any).screenshotData;
                let buf: Buffer;
                if (data) {
                  domLastFrameData = data;
                  buf = Buffer.from(data as string, "base64");
                  domLastFrameBuffer = buf;
                } else {
                  buf = domLastFrameBuffer!;
                }
                buffer = buf;
                frameBufferRing[ringIndex] = buffer;

              } catch (e) {
                fatalError = e;
                aborted = true;
                checkState();
              }
              writerWaiterPromise.resolve();
            }
          } else {
            let maxSubmits = nextFrameToWrite + maxPipelineDepth;
            while (!aborted && nextFrameToSubmit < totalFrames) {
              let i: number;
              if (nextFrameToSubmit < maxSubmits) {
                i = nextFrameToSubmit++;
                const ringIndex = i & ringMask;

                frameBufferRing[ringIndex] = null;
              } else {
                freeWorkers[freeWorkersHead++] = workerIndex;
                i = (await workerThenables[workerIndex]) as any as number;
                maxSubmits = nextFrameToWrite + maxPipelineDepth;
              }

              if (i === -1) break;

              const ringIndex = i & ringMask;

              try {
                const timePromise = timeDriver.setTime(
                  page,
                  (startFrame + i) * compTimeStep,
                );
                if (timePromise) {
                  await timePromise;
                }
                let buffer: any;
                buffer = await strategy.capture(page, i * timeStep);
                frameBufferRing[ringIndex] = buffer;

              } catch (e) {
                fatalError = e;
                aborted = true;
                checkState();
              }
              writerWaiterPromise.resolve();
            }
          }
        }
      };

      const workerPromises = this.pool.map((w, i) => runWorker(w, i));
      const stream = stdin!;
      let pendingBytes = 0;

      const isDomStrategyWriter = this.pool[0].strategy.constructor.name === 'DomStrategy';

      try {
        let nextProgress = progressInterval;
        if (nextFrameToWrite < totalFrames && !aborted) {
          while (!aborted) {
            if (aborted) break;

            const ringIndex = nextFrameToWrite & ringMask;
            while (frameBufferRing[ringIndex] === null && !aborted) {
              await writerWaiterPromise;
            }
            if (aborted) break;

            const buffer = frameBufferRing[ringIndex]!;

            const currentFrame = nextFrameToWrite;

            if (currentFrame === nextProgress) {
              nextProgress += progressInterval;
              console.log(
                `Progress: Rendered ${currentFrame} / ${totalFrames} frames`,
              );
              if (onProgress) {
                onProgress(currentFrame / totalFrames);
              }
            }

            let writeSuccess = false;
            if (isDomStrategyWriter) {
              const buf = buffer as unknown as Buffer;
              pendingBytes += buf.length;
              writeSuccess = stream.write(buf);
            } else {
              pendingBytes += (buffer as any).length;
              writeSuccess = stream.write(buffer as any);
            }
            if (!writeSuccess && pendingBytes >= 16777216) {
              await this.drainPromise;
              pendingBytes = 0;
            }

            nextFrameToWrite++;
            if (freeWorkersHead > 0) {
                const maxSubmits = nextFrameToWrite + maxPipelineDepth;
                  const limit = Math.min(maxSubmits, totalFrames);
                  let dispatches = limit - nextFrameToSubmit;
                  if (dispatches > 0) {
                    dispatches = Math.min(dispatches, freeWorkersHead);
                    let h = freeWorkersHead;
                    let n = nextFrameToSubmit;
                    for (let d = 0; d < dispatches; d++) {
                      h--;
                      const w = freeWorkers[h];
                      frameBufferRing[n & ringMask] = null;
                      workerThenables[w].resolve(n);
                      n++;
                    }
                    freeWorkersHead = h;
                    nextFrameToSubmit = n;
                  }
                if (nextFrameToSubmit === totalFrames) {
                  for (let j = 0; j < freeWorkersHead; j++) {
                    const w = freeWorkers[j];
                    workerThenables[w].resolve(-1);
                  }
                  freeWorkersHead = 0;
              }
            }
            break;
          }

          if (!aborted) {
            while (nextFrameToWrite < totalFrames && !aborted) {
              const chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);

              if (freeWorkersHead > 0) {
                const maxSubmits = nextFrameToWrite + maxPipelineDepth;
                const limit = Math.min(maxSubmits, totalFrames);
                let dispatches = limit - nextFrameToSubmit;
                if (dispatches > 0) {
                  dispatches = Math.min(dispatches, freeWorkersHead);
                  let h = freeWorkersHead;
                  let n = nextFrameToSubmit;
                  for (let d = 0; d < dispatches; d++) {
                    h--;
                    const w = freeWorkers[h];
                    frameBufferRing[n & ringMask] = null;
                    workerThenables[w].resolve(n);
                    n++;
                  }
                  freeWorkersHead = h;
                  nextFrameToSubmit = n;
                }
                if (nextFrameToSubmit === totalFrames) {
                  for (let j = 0; j < freeWorkersHead; j++) {
                    const w = freeWorkers[j];
                    workerThenables[w].resolve(-1);
                  }
                  freeWorkersHead = 0;
                }
              }

              while (nextFrameToWrite < chunkEnd) {
                const ringIndex = nextFrameToWrite & ringMask;
                if (frameBufferRing[ringIndex] === null) {
                  break;
                }

                const buffer = frameBufferRing[ringIndex]!;
                pendingBytes += (buffer as any).length;
                const writeSuccess = stream.write(buffer as any);

                if (!writeSuccess && pendingBytes >= 16777216) {
                  await this.drainPromise;
                  pendingBytes = 0;
                }

                nextFrameToWrite++;
              }

              if (nextFrameToWrite < chunkEnd) {
                const ringIndex = nextFrameToWrite & ringMask;
                while (frameBufferRing[ringIndex] === null && !aborted) {
                  await writerWaiterPromise;
                }
                if (aborted) break;
              } else if (aborted) {
                break;
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
    if (
      finalBuffer &&
      ((Buffer.isBuffer(finalBuffer) && finalBuffer.length > 0) ||
        (typeof finalBuffer === "string" && finalBuffer.length > 0))
    ) {
      console.log(`Writing final buffer...`);
      const isString = typeof finalBuffer === "string";
      if (
        !(isString
          ? stdin!.write(finalBuffer as any, "base64")
          : stdin!.write(finalBuffer as any))
      ) {
        await this.drainPromise;
      }
    }

    console.log("Finished sending frames. Closing FFmpeg stdin.");
    stdin?.end();
  }
}
