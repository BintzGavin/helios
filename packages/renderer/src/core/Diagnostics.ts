import { chromium } from 'playwright';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { RendererOptions } from '../types.js';
import { DomStrategy } from '../strategies/DomStrategy.js';
import { CanvasStrategy } from '../strategies/CanvasStrategy.js';
import { FFmpegInspector } from '../utils/FFmpegInspector.js';
import { BrowserPool } from './BrowserPool.js';

export class Diagnostics {
  constructor(private options: RendererOptions) {}

  public async run(): Promise<any> {
    console.log(`Starting diagnostics (Mode: ${this.options.mode || 'canvas'})`);

    const pool = new BrowserPool(this.options);
    const browser = await chromium.launch(pool.getLaunchOptions());

    try {
      const page = await browser.newPage();
      await page.goto('about:blank');
      const strategy = this.options.mode === 'dom' ? new DomStrategy(this.options) : new CanvasStrategy(this.options);
      const browserDiagnostics = await strategy.diagnose(page);

      const ffmpegPath = this.options.ffmpegPath || ffmpeg.path;
      const ffmpegDiagnostics = FFmpegInspector.inspect(ffmpegPath);

      return {
        browser: browserDiagnostics,
        ffmpeg: ffmpegDiagnostics,
      };
    } finally {
      await browser.close();
    }
  }

  public validateHardwareAcceleration(): void {
    const ffmpegPath = this.options.ffmpegPath || ffmpeg.path;
    const ffmpegInfo = FFmpegInspector.inspect(ffmpegPath);
    console.log(`[Helios Diagnostics] FFmpeg Version: ${ffmpegInfo.version}`);
    console.log(`[Helios Diagnostics] FFmpeg HW Accel: ${ffmpegInfo.hwaccels.join(', ') || 'none'}`);

    if (this.options.hwAccel && this.options.hwAccel !== 'auto') {
      if (!ffmpegInfo.hwaccels.includes(this.options.hwAccel)) {
        console.warn(`[Helios Warning] Hardware acceleration '${this.options.hwAccel}' was requested but is not listed in 'ffmpeg -hwaccels' output. Available: ${ffmpegInfo.hwaccels.join(', ') || 'none'}`);
      }
    }
  }
}
