import { Page, CDPSession } from 'playwright';
import { TimeDriver } from './TimeDriver.js';
import { getSeedScript } from '../utils/random-seed.js';
import { FIND_ALL_MEDIA_FUNCTION, SYNC_MEDIA_FUNCTION, PARSE_MEDIA_ATTRIBUTES_FUNCTION } from '../utils/dom-scripts.js';

const noopCatch = () => {};

export class CdpTimeDriver implements TimeDriver {
  private client: CDPSession | null = null;
  private currentTime: number = 0;
  private timeout: number;
  private cachedFrames: import('playwright').Frame[] = [];
  private setVirtualTimePolicyParams: any = { policy: 'advance', budget: 0 };
  private executionContextIds: number[] = [];
  private cachedPromises: Promise<any>[] = [];
  private cdpResolve: (() => void) | null = null;
  private cdpReject: ((err: Error) => void) | null = null;
  private evaluateStabilityParams: any = { expression: "if (typeof window.__helios_wait_until_stable === 'function') window.__helios_wait_until_stable();", awaitPromise: true, returnByValue: false };
  private singleFrameSyncMediaParams: any = { expression: "", awaitPromise: false, returnByValue: false };
  private multiFrameSyncMediaParams: any[] = [];
  private syncMediaFn: (timeInSeconds: number) => void = () => {};
  private stabilityCheckState: number = 0; // 0 = unknown, 1 = true, 2 = false

  private virtualTimePromiseExecutor = (resolve: () => void, reject: (err: Error) => void) => {
    this.cdpResolve = resolve;
    this.cdpReject = reject;

    this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams).catch(this.handleVirtualTimeBudgetError);
  };

  private defaultSyncMedia(timeInSeconds: number) {
    const frames = this.cachedFrames;
    if (frames.length === 1) {
      this.singleFrameSyncMediaParams.expression = "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");";
      this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams);
    } else {
        if (this.executionContextIds.length > 0) {
          const expression = "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");";
          if (this.multiFrameSyncMediaParams.length !== this.executionContextIds.length) {
            this.multiFrameSyncMediaParams.length = this.executionContextIds.length;
            for (let i = 0; i < this.executionContextIds.length; i++) {
              this.multiFrameSyncMediaParams[i] = {
                expression: "",
                contextId: this.executionContextIds[i],
                awaitPromise: false,
                returnByValue: false
              };
            }
          }
          for (let i = 0; i < this.executionContextIds.length; i++) {
            this.multiFrameSyncMediaParams[i].expression = expression;
            this.client!.send('Runtime.evaluate', this.multiFrameSyncMediaParams[i]);
          }
        } else {
          for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            frame.evaluate("if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");");
          }
        }
    }
  }

  private handleSyncMediaError = (e: any) => {
    console.warn('[CdpTimeDriver] Failed to sync media:', e);
  };

  private handleStabilityCheckResponse = (res: any) => {
    if (res && res.exceptionDetails) {
      throw new Error('Stability check failed: ' + res.exceptionDetails.exception?.description);
    }
  };

  private handleVirtualTimeBudgetExpired = () => {
    if (this.cdpResolve) {
      this.cdpResolve();
      this.cdpResolve = null;
      this.cdpReject = null;
    }
  };

  private handleVirtualTimeBudgetError = (err: any) => {
    if (this.cdpReject) {
      this.cdpReject(err);
      this.cdpResolve = null;
      this.cdpReject = null;
    }
  };

  private defaultStabilityCheck(): Promise<void> | void {
    return this.client!.send('Runtime.evaluate', this.evaluateStabilityParams).then((res) => {
      if (res) {
        this.handleStabilityCheckResponse(res);
      }
    }) as unknown as Promise<void>;
  }

  constructor(timeout: number = 30000) {
    this.timeout = timeout;
  }

  async init(page: Page, seed?: number): Promise<void> {
    await page.addInitScript(getSeedScript(seed));
  }

  private handleExecutionContextCreated = (event: any) => {
    if (event.context.name === '') {
      this.executionContextIds.push(event.context.id);
    }
  };

  async prepare(page: Page): Promise<void> {
    if ((page as any)._sharedCdpSession) {
      this.client = (page as any)._sharedCdpSession;
    } else {
      this.client = await page.context().newCDPSession(page);
      (page as any)._sharedCdpSession = this.client;
    }

    // Clean up potential previous listeners if reusing driver or session
    this.client!.removeListener('Runtime.executionContextCreated', this.handleExecutionContextCreated);

    this.client!.removeListener('Emulation.virtualTimeBudgetExpired', this.handleVirtualTimeBudgetExpired);
    this.client!.on('Emulation.virtualTimeBudgetExpired', this.handleVirtualTimeBudgetExpired);

    this.executionContextIds = [];
    this.client!.on('Runtime.executionContextCreated', this.handleExecutionContextCreated);

    // Initialize virtual time policy to 'pause' to take control of the clock.
    // We set initialVirtualTime to Jan 1, 2024 (UTC) to ensure deterministic Date.now()
    const INITIAL_VIRTUAL_TIME = 1704067200; // 2024-01-01T00:00:00Z in seconds
    await this.client!.send('Emulation.setVirtualTimePolicy', {
      policy: 'pause',
      initialVirtualTime: INITIAL_VIRTUAL_TIME
    });

    // Inject performance.now() override to match virtual time
    // This ensures performance.now() is deterministic and starts at 0, regardless of page load time.
    await page.evaluate((epoch) => {
      // @ts-ignore
      window.performance.now = () => Date.now() - epoch;
    }, INITIAL_VIRTUAL_TIME * 1000);

    const initScript = `
      (() => {
        ${FIND_ALL_MEDIA_FUNCTION}
        ${PARSE_MEDIA_ATTRIBUTES_FUNCTION}
        ${SYNC_MEDIA_FUNCTION}

        let cachedMediaElements = null;

        window.__helios_invalidate_cache = () => {
          cachedMediaElements = null;
        };

        window.__helios_sync_media = (t) => {
          if (!cachedMediaElements) {
            cachedMediaElements = findAllMedia(document);
          }
          const numMedia = cachedMediaElements.length;
          for (let i = 0; i < numMedia; i++) {
            syncMedia(cachedMediaElements[i], t);
          }
        };

        window.__helios_wait_until_stable = () => {
          if (typeof window.helios !== 'undefined' && typeof window.helios.waitUntilStable === 'function') {
            return window.helios.waitUntilStable();
          }
        };
      })();
    `;

    await page.addInitScript(initScript);
    const frames = page.frames();
    if (frames.length === 1) {
      await frames[0].evaluate(initScript);
    } else {
      const initPromises: Promise<any>[] = new Array(frames.length);
      for (let i = 0; i < frames.length; i++) {
        initPromises[i] = frames[i].evaluate(initScript);
      }
      await Promise.all(initPromises);
    }

    this.cachedFrames = page.frames();

    try {
      const { result } = await this.client!.send('Runtime.evaluate', {
        expression: "document.querySelectorAll('video, audio').length > 0",
        returnByValue: true
      });
      if (result && result.value) {
        this.syncMediaFn = this.defaultSyncMedia.bind(this);
      } else {
        this.syncMediaFn = () => {};
      }
    } catch (e) {
      this.syncMediaFn = this.defaultSyncMedia.bind(this);
    }

    // Enable Runtime so we actually receive executionContextCreated events
    // Catch errors in case another driver instance sharing this session already enabled it.
    await this.client!.send('Runtime.enable').catch(() => {});

    // For reused sessions where contexts already exist, we need to manually fetch them.
    if (this.executionContextIds.length === 0) {
       // Since the events didn't fire, try to manually evaluate in all frames to get context IDs
       // This handles the reuse scenario where the execution context events were consumed by a previous driver
       try {
         // In a shared session case, the best we can do is fall back or trigger a re-eval if needed
         // We'll let frame.evaluate fallback handle it if executionContextIds.length is wrong later
       } catch (e) {
          // ignore
       }
    }

    // We delay checking the stability function until the first evaluation to allow for synchronous timeline injection during initialization
    this.stabilityCheckState = 0;

    this.currentTime = 0;
  }

  setTime(page: Page, timeInSeconds: number): Promise<void> | void {
    return this.runSetTime(page, timeInSeconds);
  }

  private async runSetTime(page: Page, timeInSeconds: number): Promise<void> {
    const delta = timeInSeconds - this.currentTime;

    // If delta is 0 or negative, we don't advance.
    // In a renderer loop, time usually moves forward.
    if (delta <= 0) {
        return;
    }

    // Convert to milliseconds for CDP
    const budget = delta * 1000;

// 1. Synchronize media elements
    this.syncMediaFn(timeInSeconds);

    // 2. Advance virtual time
    // This triggers the browser event loop and requestAnimationFrame
    this.setVirtualTimePolicyParams.budget = budget;
    await new Promise<void>(this.virtualTimePromiseExecutor);

    this.currentTime = timeInSeconds;

    // Wait for custom stability checks
    if (this.stabilityCheckState === 0) {
      try {
        const { result } = await this.client!.send('Runtime.evaluate', {
          expression: "typeof window.helios !== 'undefined' && typeof window.helios.waitUntilStable === 'function'",
          returnByValue: true
        });
        if (result && result.value) {
          this.stabilityCheckState = 1;
        } else {
          this.stabilityCheckState = 2;
        }
      } catch (e) {
        this.stabilityCheckState = 1;
      }
    }

    if (this.stabilityCheckState === 1) {
      const stabilityResult = this.defaultStabilityCheck();
      if (stabilityResult) {
        await stabilityResult;
      }
    }
  }
}
