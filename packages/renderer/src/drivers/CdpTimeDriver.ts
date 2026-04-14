import { Page, CDPSession } from 'playwright';
import { TimeDriver } from './TimeDriver.js';
import { getSeedScript } from '../utils/random-seed.js';
import { FIND_ALL_MEDIA_FUNCTION, SYNC_MEDIA_FUNCTION, PARSE_MEDIA_ATTRIBUTES_FUNCTION } from '../utils/dom-scripts.js';

export class CdpTimeDriver implements TimeDriver {
  private client: CDPSession | null = null;
  private currentTime: number = 0;
  private timeout: number;
  private cachedFrames: import('playwright').Frame[] = [];
  private setVirtualTimePolicyParams: any = { policy: 'advance', budget: 0 };
  private syncMediaParams: any = {
    functionDeclaration: 'function(t) { if(typeof window.__helios_sync_media==="function") window.__helios_sync_media(t); }',
    objectId: undefined,
    arguments: [{ value: 0 }],
    returnByValue: false,
    awaitPromise: false
  };
  private waitStableParams: any = {
    functionDeclaration: 'function() { if(typeof window.__helios_wait_until_stable==="function") return window.__helios_wait_until_stable(); }',
    objectId: undefined,
    returnByValue: false,
    awaitPromise: true
  };
  private cachedPromises: Promise<any>[] = [];
  private cdpResolve: (() => void) | null = null;
  private cdpReject: ((err: Error) => void) | null = null;

  private virtualTimePromiseExecutor = (resolve: () => void, reject: (err: Error) => void) => {
    this.cdpResolve = resolve;
    this.cdpReject = reject;
    this.client!.once('Emulation.virtualTimeBudgetExpired', this.handleVirtualTimeBudgetExpired);
    this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams).catch(this.handleVirtualTimeBudgetError);
  };

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

  constructor(timeout: number = 30000) {
    this.timeout = timeout;
  }

  async init(page: Page, seed?: number): Promise<void> {
    await page.addInitScript(getSeedScript(seed));
  }

  async prepare(page: Page): Promise<void> {
    if ((page as any)._sharedCdpSession) {
      this.client = (page as any)._sharedCdpSession;
    } else {
      this.client = await page.context().newCDPSession(page);
      (page as any)._sharedCdpSession = this.client;
    }
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

        window.__helios_sync_media = (t) => {
          const mediaElements = findAllMedia(document);
          mediaElements.forEach((el) => {
            syncMedia(el, t);
          });
        };

        window.__helios_wait_until_stable = async () => {
          if (typeof window.helios !== 'undefined' && typeof window.helios.waitUntilStable === 'function') {
            await window.helios.waitUntilStable();
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

    const windowRes = await this.client!.send('Runtime.evaluate', { expression: 'window' });
    if (windowRes.result && windowRes.result.objectId) {
      this.syncMediaParams.objectId = windowRes.result.objectId;
      this.waitStableParams.objectId = windowRes.result.objectId;
    }

    this.currentTime = 0;
  }

  async setTime(page: Page, timeInSeconds: number): Promise<void> {
    const delta = timeInSeconds - this.currentTime;

    // If delta is 0 or negative, we don't advance.
    // In a renderer loop, time usually moves forward.
    if (delta <= 0) {
        return;
    }

    // Convert to milliseconds for CDP
    const budget = delta * 1000;

    // 1. Synchronize media elements (video, audio)
    // We do this manually BEFORE advancing time so that when the frame renders (rAF),
    // the video elements are already at the correct time.
    // Execute in all frames (including main frame) to support iframes
    const frames = this.cachedFrames;
    if (frames.length === 1 && this.syncMediaParams.objectId) {
      this.syncMediaParams.arguments[0].value = timeInSeconds;
      await this.client!.send('Runtime.callFunctionOn', this.syncMediaParams).catch(this.handleSyncMediaError);
    } else {
      if (frames.length === 1) {
        await frames[0].evaluate("if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");").catch(this.handleSyncMediaError);
      } else {
        if (this.cachedPromises.length !== frames.length) {
          this.cachedPromises = new Array(frames.length);
        }
        const framePromises = this.cachedPromises;
        for (let i = 0; i < frames.length; i++) {
          const frame = frames[i];
          framePromises[i] = frame.evaluate("if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");").catch(this.handleSyncMediaError);
        }
        await Promise.all(framePromises);
      }
    }

    // 2. Advance virtual time
    // This triggers the browser event loop and requestAnimationFrame
    this.setVirtualTimePolicyParams.budget = budget;
    await new Promise<void>(this.virtualTimePromiseExecutor);

    this.currentTime = timeInSeconds;

    // 3. Wait for custom stability checks
    // We use a string-based evaluation to avoid build-tool artifacts
    // We implement timeout in Node.js because setTimeout in the page
    // does not work when CDP virtual time is paused.
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<void>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Stability check timed out'));
      }, this.timeout);
    });

    try {
      await Promise.race([
        (this.waitStableParams.objectId
          ? this.client!.send('Runtime.callFunctionOn', this.waitStableParams).then(this.handleStabilityCheckResponse)
          : page.evaluate("if (typeof window.__helios_wait_until_stable === 'function') window.__helios_wait_until_stable();")),
        timeoutPromise
      ]);
    } catch (e: any) {
      if (e.message === 'Stability check timed out') {
        console.warn(`[CdpTimeDriver] Stability check timed out after ${this.timeout}ms. Terminating execution.`);
        try {
          await this.client?.send('Runtime.terminateExecution');
        } catch (termErr) {
          console.warn('[CdpTimeDriver] Failed to terminate hanging script (might have finished race):', termErr);
        }
      } else {
        throw e;
      }
    } finally {
      clearTimeout(timeoutId!);
    }
  }
}
