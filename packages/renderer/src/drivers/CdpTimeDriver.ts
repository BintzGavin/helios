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
  private syncMediaFn: () => void = () => {};

  private defaultSyncMedia() {
    const len = this.executionContextIds.length;
    if (len === 0) {
      this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams);
    } else if (len === 1) {
      this.client!.send('Runtime.evaluate', this.multiFrameSyncMediaParams[0]);
    } else {
      for (let i = 0; i < len; i++) {
        this.client!.send('Runtime.evaluate', this.multiFrameSyncMediaParams[i]);
      }
    }
  }

  private handleSyncMediaError = (e: any) => {
    console.warn('[CdpTimeDriver] Failed to sync media:', e);
  };

  private handleVirtualTimeBudgetExpired = () => {
    this.timePromise.resolve();
  };


  constructor(timeout: number = 30000) {
    this.timeout = timeout;
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

        window.__helios_sync_media = () => {
          const t = performance.now() / 1000;
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

    if (this.hasMedia) {
      this.syncMediaFn = this.defaultSyncMedia;
      this.client!.on('Runtime.executionContextCreated', this.handleExecutionContextCreated);
      // Enable Runtime so we actually receive executionContextCreated events
      // Catch errors in case another driver instance sharing this session already enabled it.
      // Runtime is enabled in DomStrategy
    } else {
      this.syncMediaFn = () => {};
    }


    this.currentTime = 0;
  }

  setTime(page: Page, timeInSeconds: number): Promise<void> {
    const delta = timeInSeconds - this.currentTime;

    // If delta is 0 or negative, we don't advance.
    // In a renderer loop, time usually moves forward.
    if (delta <= 0) {
        return RESOLVED_PROMISE;
    }

    // Convert to milliseconds for CDP

// 1. Synchronize media elements
    this.syncMediaFn();

    // 2. Advance virtual time
    // This triggers the browser event loop and requestAnimationFrame
    this.setVirtualTimePolicyParams.budget = delta * 1000;
    this.currentTime = timeInSeconds;
    this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams);
    return this.timePromise as any as Promise<void>;
  }
}
