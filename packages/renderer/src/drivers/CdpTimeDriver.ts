import { Page, CDPSession } from 'playwright';
import { TimeDriver } from './TimeDriver.js';

export class CdpTimeDriver implements TimeDriver {
  private client: CDPSession | null = null;
  private currentTime: number = 0;

  async init(page: Page): Promise<void> {
    // No-op for CdpTimeDriver
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

          // Calculate target time
          // Formula: GlobalTime - Offset + InPoint
          const targetTime = Math.max(0, t - offset + seek);

          el.currentTime = targetTime;
          // Note: We intentionally do NOT await 'seeked' here because CDP virtual time is paused.
          // Awaiting async events would cause a deadlock in the frozen task runner.
          // We rely on the browser to update the frame synchronously enough for the snapshot.
        });
      })(${timeInSeconds})
    `;
    await page.evaluate(mediaSyncScript);

    // 2. Advance virtual time
    // This triggers the browser event loop and requestAnimationFrame
    await this.client.send('Emulation.setVirtualTimePolicy', {
      policy: 'advance',
      budget: budget
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
    await page.evaluate(stabilityScript);
  }
}
