import { Page, CDPSession } from 'playwright';
import { TimeDriver } from './TimeDriver.js';
import { getSeedScript } from '../utils/random-seed.js';
import { FIND_ALL_MEDIA_FUNCTION, FIND_ALL_SCOPES_FUNCTION, SYNC_MEDIA_FUNCTION, PARSE_MEDIA_ATTRIBUTES_FUNCTION } from '../utils/dom-scripts.js';



export class SeekTimeDriver implements TimeDriver {
  private cdpSession: CDPSession | null = null;
  private cachedFrames: import('playwright').Frame[] = [];
  private cachedMainFrame: import('playwright').Frame | null = null;

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
    if ((page as any)._sharedCdpSession) {
      this.cdpSession = (page as any)._sharedCdpSession;
    } else {
      this.cdpSession = await page.context().newCDPSession(page);
      (page as any)._sharedCdpSession = this.cdpSession;
    }

    // Inject the seek script once during initialization
    // We wrap it in an IIFE to avoid polluting the global namespace with helper functions
    const initScript = `
      (() => {
        ${FIND_ALL_SCOPES_FUNCTION}
        ${FIND_ALL_MEDIA_FUNCTION}
        ${PARSE_MEDIA_ATTRIBUTES_FUNCTION}
        ${SYNC_MEDIA_FUNCTION}

        // Cache for expensive DOM scans
        let cachedScopes = null;
        let cachedAnimations = null;
        let cachedMediaElements = null;

        window.__helios_invalidate_cache = () => {
          cachedScopes = null;
          cachedAnimations = null;
          cachedMediaElements = null;
        };

        window.__helios_seek = async (t, timeoutMs) => {
          let gsapTimelineSeeked = false;
          let heliosSeeked = false;
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
          if (!cachedAnimations) {
            if (!cachedScopes) {
              cachedScopes = findAllScopes(document);
            }
            cachedAnimations = [];
            const numScopes = cachedScopes.length;
            for (let i = 0; i < numScopes; i++) {
              const scope = cachedScopes[i];
              if (scope.getAnimations) {
                const animations = scope.getAnimations();
                for (let j = 0; j < animations.length; j++) {
                  cachedAnimations.push(animations[j]);
                }
              }
            }
          }
          const numAnimations = cachedAnimations.length;
          for (let i = 0; i < numAnimations; i++) {
            const anim = cachedAnimations[i];
            anim.currentTime = timeInMs;
            if (anim.playState !== 'paused') {
              anim.pause();
            }
          }

          // CRITICAL: Trigger Helios state update FIRST to ensure subscriptions fire
          if (typeof window.helios !== 'undefined' && window.helios.seek) {
            try {
              const helios = window.helios;
              const fps = helios.fps ? helios.fps.value : 30;
              const frame = Math.floor(t * fps);

              helios.seek(frame);
              heliosSeeked = true;
              const _ = helios.currentFrame.value;
            } catch (e) {
              console.warn('[SeekTimeDriver] Error seeking Helios:', e);
            }
          }

          // Backup: Also try to seek GSAP timeline directly if it's available
          if (window.__helios_gsap_timeline__ && typeof window.__helios_gsap_timeline__.seek === 'function') {
            try {
              window.__helios_gsap_timeline__.seek(t);
              gsapTimelineSeeked = true;
            } catch (gsapError) {
              // Ignore
            }
          }

          let promises = null;

          // 1. Wait for Fonts
          if (t === 0 && document.fonts && document.fonts.ready) {
            if (!promises) promises = [];
            promises[promises.length] = document.fonts.ready;
          }

          // 2. Synchronize media elements (video, audio)
          if (!cachedMediaElements) {
            cachedMediaElements = findAllMedia(document);
          }
          const numMedia = cachedMediaElements.length;
          if (numMedia > 0) {
            for (let i = 0; i < numMedia; i++) {
              const el = cachedMediaElements[i];
              syncMedia(el, t);

              if (el.seeking || el.readyState < 2) {
                if (!promises) promises = [];
                promises[promises.length] = new Promise((resolve) => {
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
                });
              }
            }
          }

          // 3. Wait for Helios Stability (Custom Checks)
          if (typeof window.helios !== 'undefined' && typeof window.helios.waitUntilStable === 'function') {
            if (!promises) promises = [];
            promises[promises.length] = window.helios.waitUntilStable();
          }

          // 4. Wait for stability with a safety timeout (only if needed)
          if (promises && promises.length > 0) {
            let timeoutId;
            const allReady = Promise.all(promises);
            const timeoutPromise = new Promise((resolve) => {
              timeoutId = setTimeout(resolve, timeoutMs);
            });
            await Promise.race([allReady, timeoutPromise]);
            clearTimeout(timeoutId);

            // 5. After stability, ensure GSAP timelines are seeked again in case async changes occurred
            if (gsapTimelineSeeked && window.__helios_gsap_timeline__ && typeof window.__helios_gsap_timeline__.seek === 'function') {
              try {
                window.__helios_gsap_timeline__.seek(t);
              } catch (gsapError) {
                console.error('[SeekTimeDriver] Error seeking GSAP timeline:', gsapError);
              }
            }

            if (heliosSeeked && typeof window.helios !== 'undefined' && window.helios.seek) {
              try {
                const helios = window.helios;
                const fps = helios.fps ? helios.fps.value : 30;
                const frame = Math.floor(t * fps);
                helios.seek(frame);
              } catch (e) {
                console.warn('[SeekTimeDriver] Error seeking Helios:', e);
              }
            }
          }
        };
      })();
    `;

    await page.addInitScript(initScript);
    // Evaluate the init script immediately in case the page is already loaded or the script applies retroactively.
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

    this.cachedFrames = page.frames();
    this.cachedMainFrame = page.mainFrame();
  }

  setTime(page: Page, timeInSeconds: number): Promise<void> {
    const frames = this.cachedFrames;

    if (frames.length === 1) {
      const params = {
        expression: `window.__helios_seek(${timeInSeconds}, ${this.timeout})`,
        awaitPromise: true,
        returnByValue: false
      };
      return this.cdpSession!.send('Runtime.evaluate', params) as Promise<any>;
    }

    const promises: Promise<any>[] = new Array(frames.length);

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (frame === this.cachedMainFrame) {
        const params = {
          expression: `window.__helios_seek(${timeInSeconds}, ${this.timeout})`,
          awaitPromise: true,
          returnByValue: false
        };
        promises[i] = this.cdpSession!.send('Runtime.evaluate', params);
      } else {
        promises[i] = frame.evaluate(
          ([t, timeoutMs]) => { (window as any).__helios_seek(t, timeoutMs); },
          [timeInSeconds, this.timeout]
        );
      }
    }

    return Promise.all(promises) as unknown as Promise<void>;
  }
}
