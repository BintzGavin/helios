import { Page } from 'playwright';
import { TimeDriver } from './TimeDriver.js';
import { getSeedScript } from '../utils/random-seed.js';
import { FIND_ALL_MEDIA_FUNCTION, FIND_ALL_SCOPES_FUNCTION, SYNC_MEDIA_FUNCTION, PARSE_MEDIA_ATTRIBUTES_FUNCTION } from '../utils/dom-scripts.js';

export class SeekTimeDriver implements TimeDriver {
  constructor(private timeout: number = 30000) {}

  async init(page: Page, seed?: number): Promise<void> {
    await page.addInitScript(getSeedScript(seed));
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
    // Inject the seek script once during initialization
    // We wrap it in an IIFE to avoid polluting the global namespace with helper functions
    const initScript = `
      (() => {
        ${FIND_ALL_SCOPES_FUNCTION}
        ${FIND_ALL_MEDIA_FUNCTION}
        ${PARSE_MEDIA_ATTRIBUTES_FUNCTION}
        ${SYNC_MEDIA_FUNCTION}

        window.__helios_seek = async (t, timeoutMs) => {
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

          // Synchronize document timeline (WAAPI) across all scopes
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
          if (typeof window.helios !== 'undefined' && window.helios.seek) {
            try {
              const helios = window.helios;
              const fps = helios.fps ? helios.fps.value : 30;
              const frame = Math.floor(t * fps);

              helios.seek(frame);
              const _ = helios.currentFrame.value;
            } catch (e) {
              console.warn('[SeekTimeDriver] Error seeking Helios:', e);
            }
          }

          // Backup: Also try to seek GSAP timeline directly if it's available
          if (window.__helios_gsap_timeline__ && typeof window.__helios_gsap_timeline__.seek === 'function') {
            try {
              window.__helios_gsap_timeline__.seek(t);
            } catch (gsapError) {
              // Ignore
            }
          }

          const promises = [];

          // 1. Wait for Fonts
          if (document.fonts && document.fonts.ready) {
            promises.push(document.fonts.ready);
          }

          // 2. Synchronize media elements (video, audio)
          const mediaElements = findAllMedia(document);
          mediaElements.forEach((el) => {
            syncMedia(el, t);

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
          if (!gsapTimelineSeeked && window.__helios_gsap_timeline__ && typeof window.__helios_gsap_timeline__.seek === 'function') {
            try {
              window.__helios_gsap_timeline__.seek(t);
              gsapTimelineSeeked = true;
            } catch (gsapError) {
              console.error('[SeekTimeDriver] Error seeking GSAP timeline:', gsapError);
            }
          } else if (!gsapTimelineSeeked) {
            console.warn('[SeekTimeDriver] GSAP timeline not available - relying on Helios subscription');
          }

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

          await new Promise((resolve) => {
            requestAnimationFrame(() => resolve());
          });
        };
      })();
    `;

    await page.addInitScript(initScript);
    // Evaluate the init script immediately in case the page is already loaded or the script applies retroactively.
    const frames = page.frames();
    await Promise.all(frames.map((frame) => frame.evaluate(initScript)));

    // Wait for app initialization (GSAP timeline OR Helios instance)
    // This handles the race condition where main.js (ES module) hasn't finished executing when rendering starts.
    // We check for either the GSAP timeline (for GSAP projects) or the Helios global (for any Helios project).
    try {
      await page.waitForFunction(
        () => typeof (window as any).__helios_gsap_timeline__ !== 'undefined' || typeof (window as any).helios !== 'undefined',
        { timeout: this.timeout }
      );
    } catch (e) {
      // Ignore - likely a static page or initialization took too long.
      // We'll proceed and rely on Helios subscription/polling as fallback.
    }
  }

  async setTime(page: Page, timeInSeconds: number): Promise<void> {
    const frames = page.frames();
    await Promise.all(frames.map((frame) => frame.evaluate(
      ([t, timeoutMs]) => (window as any).__helios_seek(t, timeoutMs),
      [timeInSeconds, this.timeout]
    )));
  }
}
