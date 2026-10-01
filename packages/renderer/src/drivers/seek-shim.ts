import { getSeedScript } from '../utils/random-seed.js';
import { FIND_ALL_MEDIA_FUNCTION, FIND_ALL_SCOPES_FUNCTION, SYNC_MEDIA_FUNCTION, PARSE_MEDIA_ATTRIBUTES_FUNCTION } from '../utils/dom-scripts.js';

/**
 * Page-defined "draw the frame at time t" functions the renderer calls on every frame,
 * in priority order. `t` is in seconds; a returned promise is awaited before capture.
 * These are the shapes agents write unprompted (`renderAt(t)`, `__render(t)`, `seek(t)`).
 */
export const PAGE_SEEK_HOOKS = ['renderAt', '__render', 'seek'] as const;

/** Marks errors thrown by a page hook so they fail the render instead of being ignored. */
export const PAGE_HOOK_ERROR_MARKER = '[helios:page-hook]';

export interface SeekScriptOptions {
  /**
   * Run the page's pending requestAnimationFrame callbacks on every seek, with the new
   * virtual time. See SeekTimeDriverOptions.flushAnimationFrames.
   */
  flushAnimationFrames?: boolean;
}

export interface PageShimOptions extends SeekScriptOptions {
  /** Seed for the deterministic Math.random(). Defaults to the renderer's default seed. */
  seed?: number;
}

/**
 * Installs virtual time in the page: window.__HELIOS_VIRTUAL_TIME__ drives performance.now(),
 * Date.now() and requestAnimationFrame timestamps, and window.__helios_flush_animation_frames
 * runs pending rAF callbacks. Must stay self-contained: Playwright serializes it with toString().
 */
export const installVirtualTime = (): void => {
  // Initialize virtual time
  (window as any).__HELIOS_VIRTUAL_TIME__ = 0;

  // Use a fixed epoch to ensure deterministic Date.now() across runs
  const initialDate = 1704067200000; // 2024-01-01T00:00:00.000Z

  // Override performance.now()
  // We don't need to keep the original because we want full control
  window.performance.now = () => (window as any).__HELIOS_VIRTUAL_TIME__;

  // Override Date.now()
  window.Date.now = () => initialDate + (window as any).__HELIOS_VIRTUAL_TIME__;

  // Override requestAnimationFrame. Callbacks receive virtual time instead of the real
  // timestamp, and stay tracked until they run so a seek can flush them (see
  // __helios_flush_animation_frames). A callback runs once: either when the browser
  // produces a frame or when it is flushed, whichever comes first.
  const originalRAF = window.requestAnimationFrame.bind(window);
  const originalCAF = window.cancelAnimationFrame.bind(window);
  const pendingCallbacks = new Map<number, FrameRequestCallback>();
  window.requestAnimationFrame = (callback) => {
    const id = originalRAF(() => {
      if (!pendingCallbacks.delete(id)) return;
      callback((window as any).__HELIOS_VIRTUAL_TIME__);
    });
    pendingCallbacks.set(id, callback);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    pendingCallbacks.delete(id);
    originalCAF(id);
  };
  (window as any).__helios_flush_animation_frames = () => {
    if (pendingCallbacks.size === 0) return;
    // Like a browser frame: run what is queued now; callbacks queued while running
    // (a loop re-arming itself) wait for the next frame.
    const callbacks = Array.from(pendingCallbacks.values());
    pendingCallbacks.clear();
    const timestamp = (window as any).__HELIOS_VIRTUAL_TIME__;
    for (const callback of callbacks) {
      try {
        callback(timestamp);
      } catch (err) {
        // Report it the way a browser reports a throwing rAF callback, without
        // skipping the remaining callbacks.
        queueMicrotask(() => { throw err; });
      }
    }
  };
};

/**
 * The script that defines window.__helios_seek(t, timeoutMs) and
 * window.__helios_invalidate_cache in the page. Expects installVirtualTime to have run first.
 * We wrap it in an IIFE to avoid polluting the global namespace with helper functions.
 */
export function buildSeekScript(options: SeekScriptOptions = {}): string {
  const flushAnimationFrames = options.flushAnimationFrames === true;
  return `
      (() => {
        ${FIND_ALL_SCOPES_FUNCTION}
        ${FIND_ALL_MEDIA_FUNCTION}
        ${PARSE_MEDIA_ATTRIBUTES_FUNCTION}
        ${SYNC_MEDIA_FUNCTION}

        // Cache for expensive DOM scans
        let cachedScopes = null;
        let cachedAnimations = null;
        let cachedMediaElements = null;
        const cachedPromises = [];

        // Animation libraries (motion.dev, GSAP, ...) defer creating their WAAPI
        // animations to their own frame loop. Under virtualized time that loop has
        // not ticked when the first seek runs, so a scan taken then can see only the
        // declarative CSS animations and miss everything else -- permanently, since
        // the list used to be cached on that first scan. Those animations were then
        // never seeked, and the render silently produced blank or wrong scenes.
        //
        // A "stable for N seeks" heuristic is NOT enough: the count can sit at its
        // wrong initial value for several seeks before the library's loop ticks, and
        // the cache then locks in that wrong value. So instead: watch the
        // document-level animation count on every seek and rebuild whenever it moves.
        // That is one getAnimations() call per seek, which the pre-cache code already
        // paid for the document scope anyway.
        let lastDocAnimationCount = -1;

        function scanAnimations() {
          // Scopes can appear late too (shadow roots), so re-scan them while unstable.
          cachedScopes = findAllScopes(document);
          const found = [];
          const numScopes = cachedScopes.length;
          for (let i = 0; i < numScopes; i++) {
            const scope = cachedScopes[i];
            if (scope.getAnimations) {
              const animations = scope.getAnimations();
              for (let j = 0; j < animations.length; j++) {
                found.push(animations[j]);
              }
            }
          }
          return found;
        }

        // Page-defined frame hooks: window.renderAt(t) / window.__render(t) / window.seek(t),
        // with t in seconds. The first one defined wins.
        const PAGE_HOOK_NAMES = ${JSON.stringify(PAGE_SEEK_HOOKS)};
        const FLUSH_ANIMATION_FRAMES = ${flushAnimationFrames ? 'true' : 'false'};

        function findPageHook() {
          for (let i = 0; i < PAGE_HOOK_NAMES.length; i++) {
            if (typeof window[PAGE_HOOK_NAMES[i]] === 'function') return PAGE_HOOK_NAMES[i];
          }
          return null;
        }

        function pageHookError(name, t, err) {
          const detail = err && err.stack ? err.stack : String(err);
          return new Error('${PAGE_HOOK_ERROR_MARKER} window.' + name + '(' + t + ') threw: ' + detail);
        }

        // Calls the hook; returns a promise if the hook is async, otherwise null.
        function callPageHook(name, t) {
          let result;
          try {
            result = window[name](t);
          } catch (err) {
            throw pageHookError(name, t, err);
          }
          if (result && typeof result.then === 'function') {
            return Promise.resolve(result).then(undefined, (err) => { throw pageHookError(name, t, err); });
          }
          return null;
        }

        // The frame to seek Helios to at time t. A Helios bound to the document timeline
        // already follows virtual time exactly, including between its own frames when the
        // render fps differs from the composition's, and waitUntilStable() waits for that
        // exact frame; seeking it to a rounded frame made every such frame wait out the
        // stability timeout. So a bound Helios gets the exact frame (a whole frame when only
        // float error separates them); an unbound one gets whole frames, as before.
        function heliosFrameFor(helios, t) {
          const fps = helios.fps ? helios.fps.value : 30;
          const exact = t * fps;
          const nearest = Math.round(exact);
          const bound = helios.isVirtualTimeBound === true || helios.syncWithDocumentTimeline === true;
          return !bound || Math.abs(exact - nearest) < 1e-6 ? nearest : exact;
        }

        function flushAnimationFrames() {
          if (FLUSH_ANIMATION_FRAMES && typeof window.__helios_flush_animation_frames === 'function') {
            window.__helios_flush_animation_frames();
          }
        }

        window.__helios_invalidate_cache = () => {
          cachedScopes = null;
          cachedAnimations = null;
          cachedMediaElements = null;
          cachedPromises.length = 0;
          lastDocAnimationCount = -1;
        };

        window.__helios_seek = (t, timeoutMs) => {
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

          // Synchronize document timeline (WAAPI) across all scopes.
          // Re-scan whenever the document-level animation count moves, so
          // late-instantiated animations are picked up instead of being lost
          // for the whole render.
          const docAnimationCount = document.getAnimations().length;
          if (!cachedAnimations || docAnimationCount !== lastDocAnimationCount) {
            if (cachedAnimations && docAnimationCount > lastDocAnimationCount) {
              window.__HELIOS_LATE_ANIMATIONS__ = true;
            }
            cachedAnimations = scanAnimations();
            lastDocAnimationCount = docAnimationCount;
          }
          const numAnimations = cachedAnimations.length;
          for (let i = 0; i < numAnimations; i++) {
            const anim = cachedAnimations[i];
            // Pause first: pausing a running animation completes on the next frame and
            // holds whatever time it has reached by then, which drifts past a time set
            // before it. Setting the time after pause() completes the pause at exactly
            // that time.
            if (anim.playState !== 'paused') {
              anim.pause();
            }
            anim.currentTime = timeInMs;
          }

          // CRITICAL: Trigger Helios state update FIRST to ensure subscriptions fire
          if (typeof window.helios !== 'undefined' && window.helios.seek) {
            try {
              const helios = window.helios;
              helios.seek(heliosFrameFor(helios, t));
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



          cachedPromises.length = 0;
          const pendingLabels = [];
          // 1. Wait for Fonts
          if (t === 0 && document.fonts && document.fonts.ready) {
            cachedPromises[cachedPromises.length] = document.fonts.ready;
            pendingLabels.push('fonts');
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

              const hasSource = Boolean(
                el.currentSrc ||
                el.src ||
                el.querySelector('source[src]')
              );
              if (hasSource && (el.seeking || el.readyState < 2)) {
                if (!el.__helios_sync_promise) {
                  el.__helios_sync_promise = new Promise((resolve) => {
                    let resolved = false;
                    const finish = () => {
                      if (resolved) return;
                      resolved = true;
                      el.removeEventListener('seeked', finish);
                      el.removeEventListener('canplay', finish);
                      el.removeEventListener('error', finish);
                      el.__helios_sync_promise = null;
                      resolve();
                    };
                    el.addEventListener('seeked', finish);
                    el.addEventListener('canplay', finish);
                    el.addEventListener('error', finish);
                  });
                }
                cachedPromises[cachedPromises.length] = el.__helios_sync_promise;
                pendingLabels.push('<' + el.tagName.toLowerCase() + '> ' + (el.currentSrc || el.src || '').slice(-60));
              }
            }
          }

          // 3. Wait for Helios Stability (Custom Checks)
          if (typeof window.helios !== 'undefined' && typeof window.helios.waitUntilStable === 'function') {
            cachedPromises[cachedPromises.length] = window.helios.waitUntilStable();
            pendingLabels.push('helios.waitUntilStable()');
          }

          // 4. Page-defined frame hook. An async hook is awaited before capture.
          const pageHook = findPageHook();
          let pageHookIsSync = false;
          if (pageHook) {
            const hookPromise = callPageHook(pageHook, t);
            if (hookPromise) {
              cachedPromises[cachedPromises.length] = hookPromise;
              pendingLabels.push('window.' + pageHook + '()');
            } else {
              pageHookIsSync = true;
            }
          }

          // 5. Canvas mode: run queued rAF callbacks now, at the new virtual time.
          flushAnimationFrames();

          // 6. Wait for stability with a safety timeout (only if needed)
          if (cachedPromises.length > 0) {
            return new Promise((resolve, reject) => {
              let done = false;
              // Keep rAF-driven code (loops, polling) moving while we wait; under begin-frame
              // control nothing else runs it.
              const pumpId = FLUSH_ANIMATION_FRAMES ? setInterval(flushAnimationFrames, 16) : null;
              const finish = () => {
                if (done) return;
                done = true;
                clearTimeout(timeoutId);
                if (pumpId !== null) clearInterval(pumpId);

                // 7. After stability, ensure GSAP timelines are seeked again in case async changes occurred
                if (gsapTimelineSeeked && window.__helios_gsap_timeline__ && typeof window.__helios_gsap_timeline__.seek === 'function') {
                  try {
                    window.__helios_gsap_timeline__.seek(t);
                  } catch (gsapError) {
                    console.error('[SeekTimeDriver] Error seeking GSAP timeline:', gsapError);
                  }
                }

                if (heliosSeeked && typeof window.helios !== 'undefined' && window.helios.seek) {
                  try {
                    window.helios.seek(heliosFrameFor(window.helios, t));
                  } catch (e) {
                    console.warn('[SeekTimeDriver] Error seeking Helios:', e);
                  }
                }

                // A synchronous hook drew before media and fonts settled; draw again now.
                if (pageHookIsSync && findPageHook() === pageHook) {
                  try {
                    callPageHook(pageHook, t);
                  } catch (err) {
                    reject(err);
                    return;
                  }
                }
                flushAnimationFrames();
                resolve();
              };

              const fail = (err) => {
                if (done) return;
                done = true;
                clearTimeout(timeoutId);
                if (pumpId !== null) clearInterval(pumpId);
                reject(err);
              };

              const timeoutId = setTimeout(() => {
                console.warn('[Helios] Frame at t=' + t + 's was still waiting on ' + pendingLabels.join(', ') +
                  ' after ' + timeoutMs + 'ms; capturing it anyway. Raise stabilityTimeout if this frame needs longer.');
                finish();
              }, timeoutMs);

              if (cachedPromises.length === 1) {
                cachedPromises[0].then(finish, fail);
              } else {
                Promise.all(cachedPromises).then(finish, fail);
              }
            });
          }
        };
      })();
    `;
}

/**
 * One self-contained script that gives a plain browser page the renderer's "frame at t"
 * semantics: seeded Math.random(), virtual time, and window.__helios_seek(t, timeoutMs).
 * Put it in a <script> before any page script, e.g. at the top of an MCP App view's
 * srcdoc iframe, then call window.__helios_seek(t, timeoutMs) to show the frame at t
 * exactly as a render would. The renderer's SeekTimeDriver injects the same pieces
 * (getSeedScript, installVirtualTime, buildSeekScript) through Playwright.
 */
export function buildPageShim(options: PageShimOptions = {}): string {
  return getSeedScript(options.seed) +
    `;\n(${installVirtualTime.toString()})();\n` +
    buildSeekScript({ flushAnimationFrames: options.flushAnimationFrames === true });
}
