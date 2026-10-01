import { Page, CDPSession } from 'playwright';
import { TimeDriver } from './TimeDriver.js';
import { getSeedScript } from '../utils/random-seed.js';
import { installVirtualTime, buildSeekScript, PAGE_SEEK_HOOKS, PAGE_HOOK_ERROR_MARKER } from './seek-shim.js';

export { PAGE_SEEK_HOOKS };


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
 * How long to wait after load for a page to define `window.helios`, a GSAP timeline or a
 * seek hook. Pages that never define one (plain CSS, WAAPI or rAF animation) start
 * rendering after this grace period instead of waiting out the full stability timeout.
 */
export const HOOK_GRACE_MS = 3000;

const SEEK_FUNCTION_DECLARATION =
  "function(t, timeoutMs) { return typeof window.__helios_seek === 'function' ? window.__helios_seek(t, timeoutMs) : undefined; }";

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
    await page.addInitScript(installVirtualTime);

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
    const initScript = buildSeekScript({ flushAnimationFrames: this.flushAnimationFrames });

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
