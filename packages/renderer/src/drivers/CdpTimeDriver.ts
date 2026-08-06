import { Page, CDPSession } from 'playwright';
import { TimeDriver } from './TimeDriver.js';
import { getSeedScript } from '../utils/random-seed.js';
import { FIND_ALL_MEDIA_FUNCTION, SYNC_MEDIA_FUNCTION, PARSE_MEDIA_ATTRIBUTES_FUNCTION } from '../utils/dom-scripts.js';

const RESOLVED_PROMISE = Promise.resolve();

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

export class CdpTimeDriver implements TimeDriver {
  private timePromise = new ReusableThenable();
  private client: CDPSession | null = null;
  private currentTime: number = 0;
  private timeout: number;
  private setVirtualTimePolicyParams: any = { policy: 'advance', budget: 0 };
  private executionContextIds: number[] = [];
  private cachedPromises: Promise<any>[] = [];

  private singleFrameSyncMediaParams: any = { expression: "window.__helios_sync_media();" };
  private multiFrameSyncMediaParams: any[] = [];
  private hasMedia: boolean = true;
  private syncMediaFn: (timeInSeconds: number) => Promise<void> = () => RESOLVED_PROMISE;
  private mode: string;



  private handleSyncMediaError = (e: any) => {
    console.warn('[CdpTimeDriver] Failed to sync media:', e);
  };

  private handleVirtualTimeBudgetExpired = () => {
    this.timePromise.resolve();
  };

  private async waitUntilStable(): Promise<void> {
    if (!this.client) return;

    const stabilityPromise = this.client.send('Runtime.evaluate', {
      expression: "(() => typeof window.__helios_wait_until_stable === 'function' ? window.__helios_wait_until_stable() : undefined)()",
      awaitPromise: true,
      returnByValue: false,
    }).then(() => undefined).catch(() => undefined);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<void>((resolve) => {
      timeoutId = setTimeout(resolve, this.timeout);
    });

    await Promise.race([stabilityPromise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
  }

  private async setCanvasTime(
    previousTime: number,
    timeInSeconds: number,
    syncPromise: Promise<void>,
  ): Promise<void> {
    // Media must reach the target before virtual time advances, otherwise an
    // animation frame can observe the previous media time.
    await syncPromise;

    const delta = timeInSeconds - previousTime;
    this.setVirtualTimePolicyParams.budget = delta * 1000;
    this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams);
    await (this.timePromise as any as Promise<void>);
    await this.waitUntilStable();
  }

  private async setDomTime(
    syncPromise: Promise<void>,
  ): Promise<void> {
    await syncPromise;
    await this.waitUntilStable();
  }


  constructor(timeout: number = 30000, mode: string = 'canvas') {
    this.timeout = timeout;
    this.mode = mode;
  }

  async init(page: Page, seed?: number): Promise<void> {
    await page.addInitScript(getSeedScript(seed));
  }

  private handleExecutionContextCreated = (event: any) => {
    if (event.context.name === '') {
      this.executionContextIds.push(event.context.id);
      this.multiFrameSyncMediaParams.push({
          expression: "window.__helios_sync_media();",
          contextId: event.context.id
      });
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
    this.multiFrameSyncMediaParams = [];
    this.client!.on('Runtime.executionContextCreated', this.handleExecutionContextCreated);
    await this.client!.send('Runtime.enable');

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

        window.__helios_sync_media = (requestedTime) => {
          const t = typeof requestedTime === 'number'
            ? requestedTime
            : performance.now() / 1000;
          if (!cachedMediaElements) {
            cachedMediaElements = findAllMedia(document);
          }
          const numMedia = cachedMediaElements.length;
          for (let i = 0; i < numMedia; i++) {
            syncMedia(cachedMediaElements[i], t);
          }
          return numMedia;
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

    const noopCatch = () => {};

    this.hasMedia = false;
    await this.client!.send('Runtime.evaluate', {
       expression: "typeof window.__helios_sync_media === 'function' ? window.__helios_sync_media() : 0",
       returnByValue: true
    }).then(({ result }) => {
      if (result && result.value > 0) {
         this.hasMedia = true;
      }
    }).catch(() => {
      this.hasMedia = true;
    });

    await this.client!.send('Runtime.evaluate', {
      expression: "typeof window.helios !== 'undefined' && typeof window.helios.waitUntilStable === 'function'",
      returnByValue: true
    }).then(async ({ result }) => {
      if (result && result.value) {
        await this.client!.send('Runtime.evaluate', { expression: "if (typeof window.__helios_wait_until_stable === 'function') window.__helios_wait_until_stable();", awaitPromise: true, returnByValue: false }).catch(noopCatch);
      }
    }).catch(noopCatch);

    const len = this.executionContextIds.length;
    if (len === 0) {
      this.syncMediaFn = (timeInSeconds) => {
        this.singleFrameSyncMediaParams.expression = `window.__helios_sync_media(${timeInSeconds});`;
        return this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams)
          .then(() => undefined)
          .catch(this.handleSyncMediaError);
      };
    } else if (len === 1) {
      const param = this.multiFrameSyncMediaParams[0];
      this.syncMediaFn = (timeInSeconds) => {
        param.expression = `window.__helios_sync_media(${timeInSeconds});`;
        return this.client!.send('Runtime.evaluate', param)
          .then(() => undefined)
          .catch(this.handleSyncMediaError);
      };
    } else {
      const params = this.multiFrameSyncMediaParams;
      this.syncMediaFn = (timeInSeconds) => {
        const promises = new Array(params.length);
        for (let i = 0; i < len; i++) {
          params[i].expression = `window.__helios_sync_media(${timeInSeconds});`;
          promises[i] = this.client!.send('Runtime.evaluate', params[i]);
        }
        return Promise.all(promises)
          .then(() => undefined)
          .catch(this.handleSyncMediaError);
      };
    }

    this.currentTime = 0;
  }

  setTime(page: Page, timeInSeconds: number): Promise<void> | void {
    // If delta is 0 or negative, we don't advance.
    // In a renderer loop, time usually moves forward.
    if (timeInSeconds <= this.currentTime) {
        return;
    }

    // Synchronize media to the requested render time directly. Using the
    // previous virtual-clock value here leaves media one frame behind.
    const syncPromise = this.hasMedia
      ? this.syncMediaFn(timeInSeconds)
      : RESOLVED_PROMISE;

    // 2. Advance virtual time
    // This triggers the browser event loop and requestAnimationFrame
    const previousTime = this.currentTime;
    this.currentTime = timeInSeconds;

    if (this.mode === 'dom') {
      // DomStrategy's beginFrame will advance the virtual time via its 'interval' parameter
      return this.setDomTime(syncPromise);
    }

    return this.setCanvasTime(previousTime, timeInSeconds, syncPromise);
  }
}
