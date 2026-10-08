import { BrowserPool } from './core/BrowserPool.js';
import { BrowserConfig } from './types.js';
import { DEFAULT_MIN_TEXT_OPACITY, FRAME_TEXT_SCRIPT } from './utils/frame-text.js';

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

    // A fresh page: the render page carries the virtual clock and seek hooks.
    const sheetPage = await pool.workers[0].context.newPage();
    await sheetPage.setViewportSize({ width: columns * cellWidth + (columns + 1) * gap, height: 100 });
    await sheetPage.setContent(html);
    // A string, not a function: transpilers can inject helpers that do not exist in the page.
    await sheetPage.evaluate('Promise.all(Array.from(document.images, (img) => img.decode()))');
    const grid = await sheetPage.$('.grid');
    return await grid!.screenshot({ type: 'png' });
  } finally {
    await pool.close();
    await pool.cleanupStrategies();
  }
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
