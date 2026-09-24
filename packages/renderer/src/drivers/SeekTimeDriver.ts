import { Page, CDPSession } from 'playwright';
import { TimeDriver } from './TimeDriver.js';
import { getSeedScript } from '../utils/random-seed.js';
import { FIND_ALL_MEDIA_FUNCTION, FIND_ALL_SCOPES_FUNCTION, SYNC_MEDIA_FUNCTION, PARSE_MEDIA_ATTRIBUTES_FUNCTION } from '../utils/dom-scripts.js';


class ReusableAggregator {
  public resolveCb: (() => void) | null = null;
  public rejectCb: ((err: Error) => void) | null = null;
  public target: number = 0;
  public count: number = 0;

  then(resolve: () => void, reject: (err: Error) => void) {
    this.resolveCb = resolve;
    this.rejectCb = reject;
    this.check();
  }

  check() {
    if (this.count >= this.target && this.resolveCb) {
        const cb = this.resolveCb;
        this.resolveCb = null;
        this.rejectCb = null;
        cb();
    }
  }

  tick = () => {
      this.count++;
      this.check();
  };

  fail = (err: Error) => {
    if (this.rejectCb) {
        const cb = this.rejectCb;
        this.resolveCb = null;
        this.rejectCb = null;
        cb(err);
    }
  };
}


/**
 * Page-defined "draw the frame at time t" functions the renderer calls on every frame,
 * in priority order. `t` is in seconds; a returned promise is awaited before capture.
 * These are the shapes agents write unprompted (`renderAt(t)`, `__render(t)`, `seek(t)`).
 */
export const PAGE_SEEK_HOOKS = ['renderAt', '__render', 'seek'] as const;

/**
 * How long to wait after load for a page to define `window.helios`, a GSAP timeline or a
 * seek hook. Pages that never define one (plain CSS, WAAPI or rAF animation) start
 * rendering after this grace period instead of waiting out the full stability timeout.
 */
export const HOOK_GRACE_MS = 3000;

const SEEK_FUNCTION_DECLARATION =
  "function(t, timeoutMs) { return typeof window.__helios_seek === 'function' ? window.__helios_seek(t, timeoutMs) : undefined; }";

/** Marks errors thrown by a page hook so they fail the render instead of being ignored. */
const PAGE_HOOK_ERROR_MARKER = '[helios:page-hook]';

export interface SeekTimeDriverOptions {
  /**
   * Run the page's pending requestAnimationFrame callbacks on every seek, with the new
   * virtual time, instead of waiting for the browser to produce a frame. Canvas mode needs
   * this: it captures the canvas directly, so nothing else forces a frame between seek and
   * capture (and begin-frame control stops the browser from producing frames on its own).
   */
  flushAnimationFrames?: boolean;
}

export class SeekTimeDriver implements TimeDriver {
  private aggregator = new ReusableAggregator();
  private cdpSession: CDPSession | null = null;
  private multiFrameCallParams: any[] = [];
  private executionContextIds: number[] = [];
  private flushAnimationFrames: boolean;
  private warnedInternalSeekError = false;
  private callFunctionOnParams: any = {
    functionDeclaration: SEEK_FUNCTION_DECLARATION,
    arguments: [{ value: 0 }, { value: 0 }],
    awaitPromise: true
  };
  private evaluateArgs: [number, number] = [0, 0];
  private handleExecutionContextCreated = (event: any) => {
    if (event.context.name === '' && !this.executionContextIds.includes(event.context.id)) {
      this.executionContextIds.push(event.context.id);
      this.multiFrameCallParams.length = 0;
    }
  };
  private handleExecutionContextDestroyed = (event: any) => {
    const index = this.executionContextIds.indexOf(event.executionContextId);
    if (index !== -1) {
      this.executionContextIds.splice(index, 1);
      this.multiFrameCallParams.length = 0;
    }
  };
  private handleExecutionContextsCleared = () => {
    this.executionContextIds = [];
    this.multiFrameCallParams.length = 0;
  };

  constructor(private timeout: number = 30000, options: SeekTimeDriverOptions = {}) {
    this.evaluateArgs[1] = timeout;
    this.flushAnimationFrames = options.flushAnimationFrames === true;
  }

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
    });

  }

  async prepare(page: Page): Promise<void> {
    if ((page as any)._sharedCdpSession) {
      this.cdpSession = (page as any)._sharedCdpSession;
    } else {
      this.cdpSession = await page.context().newCDPSession(page);
      (page as any)._sharedCdpSession = this.cdpSession;
    }

    this.executionContextIds = [];
    this.multiFrameCallParams.length = 0;
    this.cdpSession!.removeListener('Runtime.executionContextCreated', this.handleExecutionContextCreated);
    this.cdpSession!.removeListener('Runtime.executionContextDestroyed', this.handleExecutionContextDestroyed);
    this.cdpSession!.removeListener('Runtime.executionContextsCleared', this.handleExecutionContextsCleared);
    this.cdpSession!.on('Runtime.executionContextCreated', this.handleExecutionContextCreated);
    this.cdpSession!.on('Runtime.executionContextDestroyed', this.handleExecutionContextDestroyed);
    this.cdpSession!.on('Runtime.executionContextsCleared', this.handleExecutionContextsCleared);
    // DomStrategy may already have enabled Runtime on this shared session.
    // Re-enable from a disabled state so Chrome reports existing contexts to
    // our newly attached listeners; otherwise every seek silently becomes a no-op.
    await this.cdpSession!.send('Runtime.disable');
    await this.cdpSession!.send('Runtime.enable');

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
        const FLUSH_ANIMATION_FRAMES = ${this.flushAnimationFrames ? 'true' : 'false'};

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

    // Wait for app initialization: the page has loaded and defined whatever drives it -- a
    // seek hook (window.renderAt / __render / seek), a Helios instance or a GSAP timeline.
    // This handles the race condition where main.js (ES module) hasn't finished executing when rendering starts.
    // Poll on an interval: rAF-based polling never fires under begin-frame control (canvas mode).
    const polling = 100;
    await page
      .waitForFunction(() => document.readyState === 'complete', undefined, { timeout: this.timeout, polling })
      .catch(() => {});
    await page
      .waitForFunction(
        (hookNames: string[]) => {
          const w = window as any;
          return typeof w.helios !== 'undefined' ||
            typeof w.__helios_gsap_timeline__ !== 'undefined' ||
            hookNames.some((name) => typeof w[name] === 'function');
        },
        [...PAGE_SEEK_HOOKS],
        { timeout: Math.min(this.timeout, HOOK_GRACE_MS), polling }
      )
      .catch(() => {
        // No hook after the grace period: a plain CSS/WAAPI/rAF page, driven by virtual time
        // alone. Say so: it is also what a composition whose script failed to load looks like.
        console.warn(
          '[SeekTimeDriver] The page defines no window.helios, window.renderAt(t) / __render(t) / seek(t) ' +
          'or GSAP timeline hook; rendering it on virtual time alone (CSS, WAAPI and rAF animation). ' +
          'If it should define one, check the page for load errors.'
        );
      });

    // Wait briefly to ensure execution contexts have been gathered by CDP
    await new Promise(r => setTimeout(r, 100));

    this.callFunctionOnParams.arguments[1].value = this.timeout;
      }

  /**
   * Runtime.callFunctionOn reports page exceptions in the response instead of rejecting.
   * A throwing page hook (window.renderAt etc.) fails the render with the page's own error;
   * anything else keeps the previous behaviour of carrying on, but is no longer silent.
   */
  private checkSeekResult = (response: any): void => {
    const details = response && response.exceptionDetails;
    if (!details) return;
    const description: string = details.exception?.description || details.text || 'unknown error';
    const markerIndex = description.indexOf(PAGE_HOOK_ERROR_MARKER);
    if (markerIndex !== -1) {
      // Keep the page's own error and stack; drop the frames of the renderer's seek plumbing.
      const lines = description.slice(markerIndex + PAGE_HOOK_ERROR_MARKER.length).trim().split('\n');
      const wrapperFrames = lines.findIndex((line) => /^\s*at pageHookError\b/.test(line));
      const pageLines = (wrapperFrames === -1 ? lines : lines.slice(0, wrapperFrames))
        .filter((line) => !/^\s*at (callPageHook\b|window\.__helios_seek\b|<anonymous>)/.test(line));
      throw new Error([...new Set(pageLines)].join('\n'));
    }
    if (!this.warnedInternalSeekError) {
      this.warnedInternalSeekError = true;
      console.warn(`[SeekTimeDriver] Seeking raised an error in the page; continuing: ${description}`);
    }
  };

  setTime(page: Page, timeInSeconds: number): Promise<void> | void {
    if (this.executionContextIds.length === 0) return Promise.resolve();

    if (this.executionContextIds.length === 1) {
      this.callFunctionOnParams.arguments[0].value = timeInSeconds;
      this.callFunctionOnParams.executionContextId = this.executionContextIds[0];
      return this.cdpSession!.send('Runtime.callFunctionOn', this.callFunctionOnParams).then(this.checkSeekResult);
    }

    if (this.multiFrameCallParams.length !== this.executionContextIds.length) {
      this.multiFrameCallParams.length = this.executionContextIds.length;
      for (let i = 0; i < this.executionContextIds.length; i++) {
        this.multiFrameCallParams[i] = {
          functionDeclaration: SEEK_FUNCTION_DECLARATION,
          arguments: [{ value: timeInSeconds }, { value: this.timeout }],
          executionContextId: this.executionContextIds[i],
          awaitPromise: true,
          returnByValue: false
        };
      }
    } else {
      for (let i = 0; i < this.executionContextIds.length; i++) {
        this.multiFrameCallParams[i].executionContextId = this.executionContextIds[i];
        this.multiFrameCallParams[i].arguments[0].value = timeInSeconds;
      }
    }

    this.aggregator.count = 0;
    this.aggregator.target = this.executionContextIds.length;

    for (let i = 0; i < this.executionContextIds.length; i++) {
        this.cdpSession!.send('Runtime.callFunctionOn', this.multiFrameCallParams[i])
            .then(this.checkSeekResult)
            .then(this.aggregator.tick)
            .catch(this.aggregator.fail);
    }
    return this.aggregator as any as Promise<void>;
  }
}
