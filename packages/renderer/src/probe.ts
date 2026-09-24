import { chromium } from 'playwright';
import { BrowserPool } from './core/BrowserPool.js';
import { PAGE_SEEK_HOOKS, HOOK_GRACE_MS } from './drivers/SeekTimeDriver.js';
import { BrowserConfig } from './types.js';

export interface CompositionInfo {
  /**
   * What drives the page's frames:
   * - 'helios': a `window.helios` instance
   * - 'hook': a frame function, `window.renderAt(t)`, `__render(t)` or `seek(t)` (see `hook`)
   * - 'gsap': a `window.__helios_gsap_timeline__`
   * - 'none': nothing; the page animates on its own (CSS, WAAPI, rAF)
   */
  driver: 'helios' | 'hook' | 'gsap' | 'none';
  /** The frame function the renderer will call, when `driver` is 'hook'. */
  hook?: string;
  /** Declared by a Helios composition. */
  durationInSeconds?: number;
  fps?: number;
  width?: number;
  height?: number;
}

export interface ProbeOptions {
  browserConfig?: BrowserConfig;
  /** Viewport to load the page at. Defaults to 1920x1080. */
  width?: number;
  height?: number;
  /** Upper bound on waiting for the page to load. Defaults to 30s. */
  timeoutMs?: number;
}

/**
 * Loads a composition once and reports what drives it and, for Helios compositions, the
 * duration, fps and size it declares -- so a caller can render it without being told.
 */
export async function probeComposition(url: string, options: ProbeOptions = {}): Promise<CompositionInfo> {
  const width = options.width ?? 1920;
  const height = options.height ?? 1080;
  const timeout = options.timeoutMs ?? 30000;
  const launchOptions = new BrowserPool({
    width,
    height,
    fps: 30,
    durationInSeconds: 1,
    mode: 'dom',
    browserConfig: options.browserConfig,
  }).getLaunchOptions();

  const browser = await chromium.launch(launchOptions);
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(url, { waitUntil: 'load', timeout });
    // Same readiness rule as rendering: whatever drives the page may be defined by a
    // module that finishes after load, so give it the same grace period.
    await page
      .waitForFunction(
        (hookNames: string[]) => {
          const w = window as any;
          return typeof w.helios !== 'undefined' ||
            typeof w.__helios_gsap_timeline__ !== 'undefined' ||
            hookNames.some((name) => typeof w[name] === 'function');
        },
        [...PAGE_SEEK_HOOKS],
        { timeout: Math.min(timeout, HOOK_GRACE_MS), polling: 100 }
      )
      .catch(() => {});

    // A string, not a function: transpilers can inject helpers (esbuild's __name) that do
    // not exist in the page.
    return await page.evaluate<CompositionInfo>(`(() => {
      const hookNames = ${JSON.stringify(PAGE_SEEK_HOOKS)};
      function positive(v) {
        const n = v && typeof v === 'object' && 'value' in v ? v.value : v;
        return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined;
      }
      const helios = window.helios;
      if (helios && typeof helios.seek === 'function') {
        return {
          driver: 'helios',
          durationInSeconds: positive(helios.duration),
          fps: positive(helios.fps),
          width: positive(helios.width),
          height: positive(helios.height),
        };
      }
      const hook = hookNames.find((name) => typeof window[name] === 'function');
      if (hook) return { driver: 'hook', hook };
      if (typeof window.__helios_gsap_timeline__ !== 'undefined') return { driver: 'gsap' };
      return { driver: 'none' };
    })()`);
  } finally {
    await browser.close();
  }
}
