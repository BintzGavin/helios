import { BrowserPool } from './core/BrowserPool.js';
import { BrowserConfig } from './types.js';
import { DEFAULT_MIN_TEXT_OPACITY, FRAME_TEXT_SCRIPT } from './utils/frame-text.js';
import { PAGE_ASSETS_SCRIPT, mergePageAssets, type PageAssets } from './utils/page-assets.js';

export interface CaptureFramesOptions {
  /** Viewport size. Defaults to 1920x1080. */
  width?: number;
  height?: number;
  /** Cut each frame to this region, in page pixels. */
  crop?: { x: number; y: number; width: number; height: number };
  /** Scale the PNGs, e.g. 0.25 for quarter size. Defaults to 1. */
  scale?: number;
  browserConfig?: BrowserConfig;
  /** How long a frame may wait for fonts, media or the page's hook. Defaults to 30s. */
  stabilityTimeout?: number;
}

export interface ReadFrameTextOptions {
  /** Viewport size. Defaults to 1920x1080. */
  width?: number;
  height?: number;
  browserConfig?: BrowserConfig;
  /** How long a frame may wait for fonts, media or the page's hook. Defaults to 30s. */
  stabilityTimeout?: number;
  /**
   * Text fainter than this does not count: its opacity, times its ancestors', times the
   * alpha of its fill (or stroke). Defaults to 0.1.
   */
  minOpacity?: number;
}

/** The text on screen in one frame. */
export interface FrameText {
  /**
   * Visible DOM and SVG text, in document order, one entry per run: text nodes that sit next
   * to each other on a line are joined, so letters in separate elements read as one word.
   */
  text: string[];
  /** What the page passed to `window.heliosDrawnText.add()` while drawing the frame. */
  drawn: string[];
}

export interface ContactSheetOptions extends CaptureFramesOptions {
  /** Frames per row. Defaults to up to 4. */
  columns?: number;
  /** Width of each thumbnail, in pixels. Defaults to 480, or the frame width if smaller. */
  cellWidth?: number;
}

export interface OnionSkinOptions extends CaptureFramesOptions {
  /** Width of the blended image. Defaults to 960, or the frame width if smaller. */
  imageWidth?: number;
}

/**
 * Renders the frames at the given times (seconds) as PNGs, straight from the page: the same
 * seek and capture path as a DOM-mode render, without encoding a video. For looking at a
 * composition while working on it.
 */
export async function captureFrames(url: string, times: number[], options: CaptureFramesOptions = {}): Promise<Buffer[]> {
  const pool = createPool(options);
  try {
    return await captureWithPool(pool, url, times, options);
  } finally {
    await pool.close();
    await pool.cleanupStrategies();
  }
}

/**
 * Renders the frames at the given times and lays them out in one labelled PNG, left to
 * right and top to bottom.
 */
export async function captureContactSheet(url: string, times: number[], options: ContactSheetOptions = {}): Promise<Buffer> {
  const pool = createPool(options);
  try {
    const frameWidth = options.crop?.width ?? options.width ?? 1920;
    const cellWidth = Math.round(options.cellWidth ?? Math.min(480, frameWidth));
    // Capture at thumbnail size: sharper than CSS downscaling, and far smaller.
    const frames = await captureWithPool(pool, url, times, { ...options, scale: cellWidth / frameWidth });
    const columns = Math.max(1, Math.round(options.columns ?? Math.min(4, frames.length)));
    const gap = 8;

    const cells = frames.map((png, i) => `
      <figure>
        <img src="data:image/png;base64,${png.toString('base64')}">
        <figcaption>${formatTime(times[i])}</figcaption>
      </figure>`).join('');
    const html = `<!doctype html><html><head><style>
      html, body { margin: 0; background: #16161a; }
      .grid { display: grid; grid-template-columns: repeat(${columns}, ${cellWidth}px); gap: ${gap}px; padding: ${gap}px; width: max-content; }
      figure { margin: 0; }
      img { display: block; width: ${cellWidth}px; height: auto; background: #000; }
      figcaption { font: 600 14px/1 system-ui, sans-serif; color: #d8d8e0; padding: 6px 2px 0; }
    </style></head><body><div class="grid">${cells}</div></body></html>`;

    return await screenshotHtml(pool, html, columns * cellWidth + (columns + 1) * gap, '.grid');
  } finally {
    await pool.close();
    await pool.cleanupStrategies();
  }
}

/**
 * Renders the frames at the given times and blends them into one labelled PNG, later frames
 * stronger: frame k of n weighs k / (1 + 2 + … + n). A moving element leaves a trail whose
 * spacing shows its path and easing, and the brightest copy is where it ends.
 */
export async function captureOnionSkin(url: string, times: number[], options: OnionSkinOptions = {}): Promise<Buffer> {
  const pool = createPool(options);
  try {
    const frameWidth = options.crop?.width ?? options.width ?? 1920;
    const imageWidth = Math.round(options.imageWidth ?? Math.min(960, frameWidth));
    const frames = await captureWithPool(pool, url, times, { ...options, scale: imageWidth / frameWidth });
    // Stacking layer k (from 1) at opacity 2 / (k + 1) over the layers below gives layer k
    // weight k / (k(k + 1) / 2) of the stack so far, which keeps all weights linear in k.
    const layers = frames.map((png, i) =>
      `<img src="data:image/png;base64,${png.toString('base64')}" style="opacity: ${i === 0 ? 1 : 2 / (i + 2)}">`).join('');
    const label = times.length === 1
      ? formatTime(times[0])
      : `${formatTime(times[0])} to ${formatTime(times[times.length - 1])}: ${times.length} frames, later ones stronger`;
    const gap = 8;
    const html = `<!doctype html><html><head><style>
      html, body { margin: 0; background: #16161a; }
      .onion { padding: ${gap}px; width: max-content; }
      .stack { position: relative; width: ${imageWidth}px; background: #000; }
      .stack img { display: block; width: ${imageWidth}px; height: auto; }
      .stack img + img { position: absolute; left: 0; top: 0; }
      .label { font: 600 14px/1 system-ui, sans-serif; color: #d8d8e0; padding: 6px 2px 0; }
    </style></head><body><div class="onion"><div class="stack">${layers}</div><div class="label">${label}</div></div></body></html>`;
    return await screenshotHtml(pool, html, imageWidth + 2 * gap, '.onion');
  } finally {
    await pool.close();
    await pool.cleanupStrategies();
  }
}

/** Screenshots one element of an HTML page laid out at the given width. */
async function screenshotHtml(pool: BrowserPool, html: string, width: number, selector: string): Promise<Buffer> {
  // A fresh page: the render page carries the virtual clock and seek hooks.
  const page = await pool.workers[0].context.newPage();
  await page.setViewportSize({ width, height: 100 });
  await page.setContent(html);
  // A string, not a function: transpilers can inject helpers that do not exist in the page.
  await page.evaluate('Promise.all(Array.from(document.images, (img) => img.decode()))');
  const element = await page.$(selector);
  return await element!.screenshot({ type: 'png' });
}

/**
 * Reads the text on screen at each time (seconds), seeking the page the way a DOM-mode
 * render does, in one page session. For checking that timed text (lyrics, captions) is on
 * screen when it should be, without screenshots.
 *
 * Before each frame `window.heliosDrawnText` is set to a new Set, so pages that draw text
 * where the DOM cannot see it (a canvas) can declare it with
 * `window.heliosDrawnText?.add(text)`. During a normal render it is undefined, and the call
 * does nothing.
 *
 * DOM and SVG text counts when its element is rendered (not display: none, visibility:
 * hidden or opacity: 0 anywhere up the tree), its effective opacity reaches `minOpacity`,
 * and at least half of it lies inside the viewport and inside any ancestor whose overflow
 * clips it. It does not detect text covered by other elements, cut by clip-path or masks,
 * or too small or low-contrast to read: contact sheets are for that.
 */
export async function readFrameText(url: string, times: number[], options: ReadFrameTextOptions = {}): Promise<FrameText[]> {
  const pool = createPool(options);
  try {
    await pool.init(url);
    const { page, timeDriver } = pool.workers[0];
    await page.evaluate(FRAME_TEXT_SCRIPT);
    const minOpacity = options.minOpacity ?? DEFAULT_MIN_TEXT_OPACITY;
    const frames: FrameText[] = [];
    if (times.length > 0) await page.evaluate(`window.__helios_arm_drawn_text(${JSON.stringify(times[0])})`);
    for (let i = 0; i < times.length; i++) {
      await timeDriver.setTime(page, times[i]);
      // Reads this frame and arms the next one in the same call.
      const next = i + 1 < times.length ? JSON.stringify(times[i + 1]) : 'undefined';
      frames.push(await page.evaluate<FrameText>(`window.__helios_read_frame_text(${JSON.stringify(minOpacity)}, ${next})`));
    }
    if (pool.capturedErrors.length > 0) throw pool.capturedErrors[0];
    return frames;
  } finally {
    await pool.close();
    await pool.cleanupStrategies();
  }
}

/**
 * Seeks the page to each time (seconds) and lists the images, fonts and requests that failed
 * to load by then: broken `<img>` elements, `@font-face` files that did not load, and
 * requests answered with HTTP 400 or above. A render shows these as empty boxes or fallback
 * fonts without failing, so this is how to catch them before rendering.
 */
export async function readPageAssets(url: string, times: number[], options: CaptureFramesOptions = {}): Promise<PageAssets> {
  const pool = createPool(options);
  try {
    await pool.init(url);
    const { page, timeDriver } = pool.workers[0];
    const readings: PageAssets[] = [await page.evaluate<PageAssets>(PAGE_ASSETS_SCRIPT)];
    for (const t of times) {
      await timeDriver.setTime(page, t);
      readings.push(await page.evaluate<PageAssets>(PAGE_ASSETS_SCRIPT));
    }
    if (pool.capturedErrors.length > 0) throw pool.capturedErrors[0];
    return mergePageAssets(readings);
  } finally {
    await pool.close();
    await pool.cleanupStrategies();
  }
}

function createPool(options: CaptureFramesOptions): BrowserPool {
  return new BrowserPool({
    width: options.width ?? 1920,
    height: options.height ?? 1080,
    fps: 30,
    durationInSeconds: 1,
    mode: 'dom',
    browserConfig: options.browserConfig,
    stabilityTimeout: options.stabilityTimeout,
  });
}

async function captureWithPool(pool: BrowserPool, url: string, times: number[], options: CaptureFramesOptions): Promise<Buffer[]> {
  await pool.init(url);
  const { page, timeDriver } = pool.workers[0];
  const cdp = (page as any)._sharedCdpSession;
  const scale = options.scale ?? 1;
  const region = options.crop ?? (scale !== 1 ? { x: 0, y: 0, width: options.width ?? 1920, height: options.height ?? 1080 } : undefined);
  const clip = region ? { ...region, scale } : undefined;
  const frames: Buffer[] = [];
  for (const t of times) {
    await timeDriver.setTime(page, t);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, ...(clip ? { clip } : {}) });
    frames.push(Buffer.from(data, 'base64'));
  }
  if (pool.capturedErrors.length > 0) throw pool.capturedErrors[0];
  return frames;
}

function formatTime(t: number): string {
  return `${Number(t.toFixed(3))}s`;
}
