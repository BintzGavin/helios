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
  private evaluateStabilityParams: any = { expression: "if (typeof window.__helios_wait_until_stable === 'function') window.__helios_wait_until_stable();", awaitPromise: true };

  private stabilityTimeoutId: NodeJS.Timeout | null = null;
  private stabilityTimeoutReject: ((err: Error) => void) | null = null;

  private stabilityTimeoutCallback = () => {
    if (this.stabilityTimeoutReject) {
      this.stabilityTimeoutReject(new Error('Stability check timed out'));
    }
  };

  private stabilityTimeoutExecutor = (_: () => void, reject: (err: Error) => void) => {
    this.stabilityTimeoutReject = reject;
    this.stabilityTimeoutId = setTimeout(this.stabilityTimeoutCallback, this.timeout);
  };

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

    this.currentTime = 0;
  }

  setTime(page: Page, timeInSeconds: number): void {
    this.runSetTime(page, timeInSeconds).catch(noopCatch);
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

    // 1. Synchronize media elements (video, audio)
    // We do this manually BEFORE advancing time so that when the frame renders (rAF),
    // the video elements are already at the correct time.
    // Execute in all frames (including main frame) to support iframes
    const frames = this.cachedFrames;
    if (frames.length === 1) {
      await this.client!.send('Runtime.evaluate', {
        expression: "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");",
        awaitPromise: false
      }).catch(this.handleSyncMediaError);
    } else {
        if (this.executionContextIds.length > 0) {
          if (this.cachedPromises.length !== this.executionContextIds.length) {
            this.cachedPromises = new Array(this.executionContextIds.length);
          }
          const framePromises = this.cachedPromises;
          const expression = "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");";
          for (let i = 0; i < this.executionContextIds.length; i++) {
            framePromises[i] = this.client!.send('Runtime.evaluate', {
              expression: expression,
              contextId: this.executionContextIds[i],
              awaitPromise: false
            }).catch(this.handleSyncMediaError);
          }
          await Promise.all(framePromises);
        } else {
          // Fallback if execution contexts couldn't be resolved (e.g. reused CDP session)
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
    // We use a string-based evaluation to avoid build-tool artifacts.
    // We rely on awaitPromise: true natively.

    // We still need a timeout mechanism because CDP evaluate with awaitPromise doesn't have an inherent timeout,
    // and virtual time is paused, so internal setTimeout won't work.
    const evaluatePromise = this.client!.send('Runtime.evaluate', this.evaluateStabilityParams).then(this.handleStabilityCheckResponse);

    const timeoutPromise = new Promise<void>(this.stabilityTimeoutExecutor);

    try {
        await Promise.race([evaluatePromise, timeoutPromise]);
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
        if (this.stabilityTimeoutId !== null) {
            clearTimeout(this.stabilityTimeoutId);
            this.stabilityTimeoutId = null;
        }
        this.stabilityTimeoutReject = null;
    }
  }
}
