import { Page, CDPSession } from 'playwright';
import { TimeDriver } from './TimeDriver.js';
import { RANDOM_SEED_SCRIPT } from '../utils/random-seed.js';

export class CdpTimeDriver implements TimeDriver {
  private client: CDPSession | null = null;
  private currentTime: number = 0;
  private timeout: number;

  constructor(timeout: number = 30000) {
    this.timeout = timeout;
  }

  async init(page: Page): Promise<void> {
    await page.addInitScript(RANDOM_SEED_SCRIPT);
  }

  async prepare(page: Page): Promise<void> {
    this.client = await page.context().newCDPSession(page);
    // Initialize virtual time policy to 'pause' to take control of the clock.
    // We set initialVirtualTime to Jan 1, 2024 (UTC) to ensure deterministic Date.now()
    const INITIAL_VIRTUAL_TIME = 1704067200; // 2024-01-01T00:00:00Z in seconds
    await this.client.send('Emulation.setVirtualTimePolicy', {
      policy: 'pause',
      initialVirtualTime: INITIAL_VIRTUAL_TIME
    });

    // Inject performance.now() override to match virtual time
    // This ensures performance.now() is deterministic and starts at 0, regardless of page load time.
    await page.evaluate((epoch) => {
      // @ts-ignore
      window.performance.now = () => Date.now() - epoch;
    }, INITIAL_VIRTUAL_TIME * 1000);

    this.currentTime = 0;
  }

  async setTime(page: Page, timeInSeconds: number): Promise<void> {
    if (!this.client) {
      throw new Error('CdpTimeDriver not prepared. Call prepare() first.');
    }

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
    const mediaSyncScript = `
      (async (t) => {
        // Helper to find all media elements, including in Shadow DOM
        function findAllMedia(rootNode) {
          const media = [];
          // Check rootNode (if it is an Element)
          if (rootNode.nodeType === Node.ELEMENT_NODE) {
            const tagName = rootNode.tagName;
            if (tagName === 'AUDIO' || tagName === 'VIDEO') {
              media.push(rootNode);
            }
          }

          const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT);
          while (walker.nextNode()) {
            const node = walker.currentNode;
            if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
              media.push(node);
            }
            if (node.shadowRoot) {
              media.push(...findAllMedia(node.shadowRoot));
            }
          }
          return media;
        }

        const mediaElements = findAllMedia(document);
        console.log('[CdpTimeDriver] Syncing ' + mediaElements.length + ' media elements to ' + t);

        mediaElements.forEach((el) => {
          el.pause(); // Ensure we are in control

          // Parse attributes (default to 0)
          const offset = parseFloat(el.getAttribute('data-helios-offset') || '0');
          const seek = parseFloat(el.getAttribute('data-helios-seek') || '0');

          // Parse playbackRate
          // We check the property first. If it's the default (1.0), we also check the attribute
          // to support declarative usage (e.g. <video playbackRate="0.5">).
          // If the property is not 1.0, we assume it was set programmatically and respect it.
          let rate = el.playbackRate;
          if (rate === 1.0) {
            const rateAttr = el.getAttribute('playbackRate');
            if (rateAttr) {
              const parsed = parseFloat(rateAttr);
              if (!isNaN(parsed)) {
                rate = parsed;
              }
            }
          }

          if (isNaN(rate) || rate <= 0) {
            rate = 1.0;
          }

          // Calculate target time
          // Formula: (GlobalTime - Offset) * Rate + Seek
          let targetTime = Math.max(0, (t - offset) * rate + seek);

          // Handle Looping
          if (el.loop && el.duration > 0 && targetTime > el.duration) {
            targetTime = targetTime % el.duration;
          }

          el.currentTime = targetTime;
          // Note: We intentionally do NOT await 'seeked' here because CDP virtual time is paused.
          // Awaiting async events would cause a deadlock in the frozen task runner.
          // We rely on the browser to update the frame synchronously enough for the snapshot.
        });
      })(${timeInSeconds})
    `;

    // Execute in all frames (including main frame) to support iframes
    const frames = page.frames();
    await Promise.all(frames.map(frame =>
      frame.evaluate(mediaSyncScript).catch(e => {
        // Ignore errors in restricted frames (e.g. cross-origin if CSP blocks it, though we usually disable security)
        console.warn('[CdpTimeDriver] Failed to sync media in frame ' + frame.url() + ':', e);
      })
    ));

    // 2. Advance virtual time
    // This triggers the browser event loop and requestAnimationFrame
    await new Promise<void>((resolve, reject) => {
      if (!this.client) return resolve();

      // Use 'once' to avoid leaking listeners
      this.client.once('Emulation.virtualTimeBudgetExpired', () => resolve());

      this.client.send('Emulation.setVirtualTimePolicy', {
        policy: 'advance',
        budget: budget
      }).catch(reject);
    });

    this.currentTime = timeInSeconds;

    // 3. Wait for custom stability checks
    // We use a string-based evaluation to avoid build-tool artifacts
    const stabilityScript = `
      (async () => {
        if (typeof window.helios !== 'undefined' && typeof window.helios.waitUntilStable === 'function') {
          await window.helios.waitUntilStable();
        }
      })()
    `;

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
        page.evaluate(stabilityScript),
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
