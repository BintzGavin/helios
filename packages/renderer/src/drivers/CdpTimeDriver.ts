import { Page, CDPSession } from 'playwright';
import { TimeDriver } from './TimeDriver.js';
import { getSeedScript } from '../utils/random-seed.js';
import { FIND_ALL_MEDIA_FUNCTION, SYNC_MEDIA_FUNCTION, PARSE_MEDIA_ATTRIBUTES_FUNCTION } from '../utils/dom-scripts.js';

export class CdpTimeDriver implements TimeDriver {
  private client: CDPSession | null = null;
  private currentTime: number = 0;
  private timeout: number;
  private virtualTimePolicyParams: any = {
    policy: 'advance',
    budget: 0
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
    const frames = page.frames();
    if (frames.length === 1) {
      await frames[0].evaluate((t) => {
        if (typeof (window as any).__helios_sync_media === 'function') {
          (window as any).__helios_sync_media(t);
        }
      }, timeInSeconds).catch(e => {
        console.warn('[CdpTimeDriver] Failed to sync media in frame ' + frames[0].url() + ':', e);
      });
    } else {
      const framePromises: Promise<any>[] = new Array(frames.length);
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        framePromises[i] = frame.evaluate((t) => {
          if (typeof (window as any).__helios_sync_media === 'function') {
            (window as any).__helios_sync_media(t);
          }
        }, timeInSeconds).catch(e => {
          // Ignore errors in restricted frames (e.g. cross-origin if CSP blocks it, though we usually disable security)
          console.warn('[CdpTimeDriver] Failed to sync media in frame ' + frame.url() + ':', e);
        });
      }
      await Promise.all(framePromises);
    }

    // 2. Advance virtual time
    // This triggers the browser event loop and requestAnimationFrame
    await new Promise<void>((resolve, reject) => {
      // Use 'once' to avoid leaking listeners
      this.client!.once('Emulation.virtualTimeBudgetExpired', () => resolve());

      this.virtualTimePolicyParams.budget = budget;
      this.client!.send('Emulation.setVirtualTimePolicy', this.virtualTimePolicyParams).catch(reject);
    });

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
        page.evaluate(() => {
          if (typeof (window as any).__helios_wait_until_stable === 'function') {
            return (window as any).__helios_wait_until_stable();
          }
        }),
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
