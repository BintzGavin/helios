import { Page } from 'playwright';
import { TimeDriver } from './TimeDriver.js';
import { RANDOM_SEED_SCRIPT } from '../utils/random-seed.js';

export class SeekTimeDriver implements TimeDriver {
  constructor(private timeout: number = 30000) {}

  async init(page: Page): Promise<void> {
    await page.addInitScript(RANDOM_SEED_SCRIPT);
    await page.addInitScript(() => {
      // Initialize virtual time
      (window as any).__HELIOS_VIRTUAL_TIME__ = 0;

      // Use a fixed epoch to ensure deterministic Date.now() across runs
      const initialDate = 1704067200000; // 2024-01-01T00:00:00.000Z

      // Override performance.now()
      // We don't need to keep the original because we want full control
      window.performance.now = () => (window as any).__HELIOS_VIRTUAL_TIME__;

      // Override Date.now()
      window.Date.now = () => initialDate + (window as any).__HELIOS_VIRTUAL_TIME__;

      // Override requestAnimationFrame
      const originalRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = (callback) => {
        return originalRAF((_timestamp) => {
          // Pass virtual time to the callback instead of the real timestamp
          callback((window as any).__HELIOS_VIRTUAL_TIME__);
        });
      };
    });
  }

  async prepare(page: Page): Promise<void> {
    // Wait for app initialization (GSAP timeline OR Helios instance)
    // This handles the race condition where main.js (ES module) hasn't finished executing when rendering starts.
    // We check for either the GSAP timeline (for GSAP projects) or the Helios global (for any Helios project).
    try {
      await page.waitForFunction(
        () => typeof (window as any).__helios_gsap_timeline__ !== 'undefined' || typeof (window as any).helios !== 'undefined',
        { timeout: 5000 }
      );
    } catch (e) {
      // Ignore - likely a static page or initialization took too long.
      // We'll proceed and rely on Helios subscription/polling as fallback.
    }
  }

  async setTime(page: Page, timeInSeconds: number): Promise<void> {
    // We use a string-based evaluation to avoid build-tool artifacts (like esbuild's __name helper)
    // interfering with the client-side execution in Playwright.
    const script = `
      (async (t, timeoutMs) => {
        let gsapTimelineSeeked = false;
        const timeInMs = t * 1000;

        // Update the global virtual time
        window.__HELIOS_VIRTUAL_TIME__ = timeInMs;

        // Check for reactive binding (if supported)
        if (typeof window.helios !== 'undefined' && typeof window.helios.isVirtualTimeBound !== 'undefined') {
          if (!window.helios.isVirtualTimeBound && !window.__HELIOS_WARNED_VIRTUAL_TIME__) {
            console.warn('[SeekTimeDriver] Warning: Helios is not reactively bound to virtual time. Fallback polling usage detected.');
            window.__HELIOS_WARNED_VIRTUAL_TIME__ = true;
          }
        }

        // Helper to find all scopes (Document + ShadowRoots)
        function findAllScopes(rootNode) {
          const scopes = [rootNode];
          const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT);
          while (walker.nextNode()) {
            const node = walker.currentNode;
            if (node.shadowRoot) {
              scopes.push.apply(scopes, findAllScopes(node.shadowRoot));
            }
          }
          return scopes;
        }

        // Synchronize document timeline (WAAPI) across all scopes
        // document.timeline.currentTime is read-only in many contexts or doesn't control CSS animations reliably.
        // We must iterate over all animations and set their currentTime explicitly.
        const allScopes = findAllScopes(document);
        allScopes.forEach((scope) => {
          if (scope.getAnimations) {
            scope.getAnimations().forEach((anim) => {
              anim.currentTime = timeInMs;
              anim.pause();
            });
          }
        });

        // CRITICAL: Trigger Helios state update FIRST to ensure subscriptions fire
        // This is what the original working code relied on - the Helios subscription
        // callback seeks the GSAP timeline. We call helios.seek() to trigger this.
        if (typeof window.helios !== 'undefined' && window.helios.seek) {
          try {
            const helios = window.helios;
            // fps is a ReadonlySignal, access via .value property
            const fps = helios.fps ? helios.fps.value : 30;
            const frame = Math.floor(t * fps);
            
            // Seek Helios - this updates the signal and triggers the effect/subscription
            // The subscription callback will seek the GSAP timeline
            helios.seek(frame);
            
            // Force the effect to run by reading the signal value
            // This ensures the subscription callback executes synchronously
            const _ = helios.currentFrame.value;
          } catch (e) {
            console.warn('[SeekTimeDriver] Error seeking Helios:', e);
          }
        }
        
        // Backup: Also try to seek GSAP timeline directly if it's available
        // This is a safety net in case the subscription doesn't fire in time
        if (window.__helios_gsap_timeline__ && typeof window.__helios_gsap_timeline__.seek === 'function') {
          try {
            window.__helios_gsap_timeline__.seek(t);
          } catch (gsapError) {
            // Ignore - subscription should handle it
          }
        }

        const promises = [];

        // 1. Wait for Fonts
        if (document.fonts && document.fonts.ready) {
          promises.push(document.fonts.ready);
        }

        // Helper to find all media elements, including in Shadow DOM
        function findAllMedia(rootNode) {
          const media = [];
          // Check rootNode itself (if it is an Element)
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
              media.push.apply(media, findAllMedia(node.shadowRoot));
            }
          }
          return media;
        }

        // 2. Synchronize media elements (video, audio)
        const mediaElements = findAllMedia(document);
        mediaElements.forEach((el) => {
          el.pause();

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

          // Check if we need to wait for seeking to complete
          // readyState < 2 (HAVE_CURRENT_DATA) means we don't have the frame yet
          if (el.seeking || el.readyState < 2) {
            promises.push(new Promise((resolve) => {
              let resolved = false;
              const finish = () => {
                if (resolved) return;
                resolved = true;
                cleanup();
                resolve();
              };
              const cleanup = () => {
                el.removeEventListener('seeked', finish);
                el.removeEventListener('canplay', finish);
                el.removeEventListener('error', finish);
              };
              el.addEventListener('seeked', finish);
              el.addEventListener('canplay', finish);
              el.addEventListener('error', finish);
            }));
          }
        });

        // 3. Wait for Helios Stability (Custom Checks)
        if (typeof window.helios !== 'undefined' && typeof window.helios.waitUntilStable === 'function') {
          promises.push(window.helios.waitUntilStable());
        }

        // 4. Wait for stability with a safety timeout
        const allReady = Promise.all(promises);
        const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs));
        await Promise.race([allReady, timeout]);

        // 5. After stability, ensure GSAP timelines are seeked
        // This is done after stability checks to ensure the timeline is fully initialized
        
        // CRITICAL: Seek GSAP timeline directly - this is the most reliable approach
        // The Helios subscription approach relies on async polling which may not fire in time
        // By this point, the page should be fully loaded, so the timeline should be available
        if (!gsapTimelineSeeked && window.__helios_gsap_timeline__ && typeof window.__helios_gsap_timeline__.seek === 'function') {
          try {
            window.__helios_gsap_timeline__.seek(t);
            gsapTimelineSeeked = true;
          } catch (gsapError) {
            console.error('[SeekTimeDriver] Error seeking GSAP timeline:', gsapError);
          }
        } else if (!gsapTimelineSeeked) {
          // Timeline not available - this means main.js hasn't executed yet
          // Fall back to Helios subscription approach (which should work once polling runs)
          console.warn('[SeekTimeDriver] GSAP timeline not available - relying on Helios subscription');
        }
        
        // Also ensure Helios state is updated (triggers subscriptions as backup)
        if (typeof window.helios !== 'undefined' && window.helios.seek) {
          try {
            const helios = window.helios;
            const fps = helios.fps ? helios.fps.value : 30;
            const frame = Math.floor(t * fps);
            helios.seek(frame);
          } catch (e) {
            console.warn('[SeekTimeDriver] Error seeking Helios:', e);
          }
        }

        // Wait for frames to ensure:
        // 1. WAAPI animations are synced
        // 2. GSAP timeline updates have been applied to DOM
        // 3. Helios polling loop has run (bindToDocumentTimeline polls via rAF)
        // 4. All visual updates propagate to the DOM
        // We need multiple rAFs to ensure GSAP has time to update the DOM
        // GSAP's seek() is synchronous but DOM updates may need a frame to render
        await new Promise((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                // One more frame to ensure everything is fully rendered
                requestAnimationFrame(() => resolve());
              });
            });
          });
        });
      })(${timeInSeconds}, ${this.timeout})
    `;

    const frames = page.frames();
    await Promise.all(frames.map((frame) => frame.evaluate(script)));
  }
}
