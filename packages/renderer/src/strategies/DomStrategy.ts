import { Page, CDPSession } from 'playwright';
import { RenderStrategy } from './RenderStrategy.js';
import { RendererOptions, AudioTrackConfig, FFmpegConfig } from '../types.js';
import { FFmpegBuilder } from '../utils/FFmpegBuilder.js';
import { scanForAudioTracks } from '../utils/dom-scanner.js';
import { extractBlobTracks } from '../utils/blob-extractor.js';
import { FIND_DEEP_ELEMENT_SCRIPT } from '../utils/dom-finder.js';
import { PRELOAD_SCRIPT } from '../utils/dom-preload.js';

const EMPTY_IMAGE_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

export class DomStrategy implements RenderStrategy {
  private discoveredAudioTracks: AudioTrackConfig[] = [];
  private cleanupAudio: () => Promise<void> | void = () => {};
  private cdpSession: CDPSession | null = null;
  private lastFrameBuffer: Buffer | null = null;
  private cdpScreenshotParams: any = null;
  private targetElementHandle: any = null;
  private emptyImageBuffer: Buffer = EMPTY_IMAGE_BUFFER;
  private frameInterval: number = 0;

  constructor(private options: RendererOptions) {
    if (this.options.videoCodec === 'copy') {
      throw new Error("DomStrategy produces image sequences and cannot be used with 'copy' codec. Please use a transcoding codec like 'libx264' (default).");
    }
  }

  async diagnose(page: Page): Promise<any> {
    return await page.evaluate(() => {
      console.log('[Helios Diagnostics] Checking DOM environment...');

      let webgl = false;
      try {
          const canvas = document.createElement('canvas');
          webgl = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      } catch (e) {
          // ignore
      }

      const report = {
        waapi: typeof document !== 'undefined' && 'timeline' in document,
        animations: typeof document.getAnimations === 'function' ? 'supported' : 'unsupported',
        userAgent: navigator.userAgent,
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            dpr: window.devicePixelRatio || 1
        },
        webgl
      };
      return report;
    });
  }

  async prepare(page: Page): Promise<void> {
    const timeout = this.options.stabilityTimeout || 30000;
    const script = `${PRELOAD_SCRIPT}(${timeout})`;

    // Execute preloading script in all frames
    const frames = page.frames();
    const framePromises = new Array(frames.length);
    for (let i = 0; i < frames.length; i++) {
        framePromises[i] = frames[i].evaluate(script);
    }
    await Promise.all(framePromises);

    // Scan for audio tracks using the shared utility
    const initialTracks = await scanForAudioTracks(page, timeout);

    // Extract blobs to temp files
    const extractionResult = await extractBlobTracks(page, initialTracks);
    this.discoveredAudioTracks = extractionResult.tracks;
    this.cleanupAudio = extractionResult.cleanup;

    if ((page as any)._sharedCdpSession) {
      this.cdpSession = (page as any)._sharedCdpSession;
    } else {
      this.cdpSession = await page.context().newCDPSession(page);
      (page as any)._sharedCdpSession = this.cdpSession;
    }
    await this.cdpSession!.send('HeadlessExperimental.enable');

    // Check if the requested pixel format supports alpha
    const pixelFormat = this.options.pixelFormat || 'yuv420p';
    const hasAlpha = pixelFormat.includes('yuva') ||
                     pixelFormat.includes('rgba') ||
                     pixelFormat.includes('bgra') ||
                     pixelFormat.includes('argb') ||
                     pixelFormat.includes('abgr');

    // Emulate Browser.setDownloadBehavior/etc or use Emulation to set transparent background
    if (hasAlpha) {
      await this.cdpSession!.send('Emulation.setDefaultBackgroundColorOverride', {
        color: { r: 0, g: 0, b: 0, a: 0 }
      }).catch(() => {});
    }

    // Cache parameters
    let format = this.options.intermediateImageFormat;
    let quality = this.options.intermediateImageQuality;

    if (!format) {
      if (hasAlpha) {
        format = 'webp';
        quality = quality ?? 75;
      } else {
        format = 'jpeg';
        quality = quality ?? 75;
      }
    }

    const screenshotOptions: any = {
      type: format,
    };

    if (format === 'jpeg' || format === 'webp') {
      if (quality !== undefined) {
        screenshotOptions.quality = quality;
      }
    }

    if (format !== 'jpeg') {
      screenshotOptions.omitBackground = hasAlpha;
    }

    const cdpScreenshotParams: any = { format };
    if ((format === 'jpeg' || format === 'webp') && quality !== undefined) {
      cdpScreenshotParams.quality = quality;
    }

    this.frameInterval = 1000 / this.options.fps;
    this.cdpScreenshotParams = cdpScreenshotParams;

    // Set format-appropriate empty buffer
    if (format === 'jpeg') {
        // 1x1 JPEG pixel
        this.emptyImageBuffer = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
    } else if (format === 'webp') {
        // 1x1 WEBP pixel
        this.emptyImageBuffer = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64');
    } else {
        // Default to PNG
        this.emptyImageBuffer = EMPTY_IMAGE_BUFFER;
    }

    // We also save screenshotOptions on this since fallback uses it, though we could just keep it local if not used in capture.
    // Actually fallback is used in capture when CDP is unavailable. Let's add it to this.
    (this as any).fallbackScreenshotOptions = screenshotOptions;

    if (this.options.targetSelector) {
      const handle = await page.evaluateHandle((args) => {
        // @ts-ignore
        const finder = eval(args.script);
        const element = finder(document, args.selector);
        if (!element) throw new Error(`Target element not found: ${args.selector}`);
        return element;
      }, { script: FIND_DEEP_ELEMENT_SCRIPT, selector: this.options.targetSelector });

      const element = handle.asElement();
      if (!element) {
        throw new Error(`Target element found but is not an element: ${this.options.targetSelector}`);
      }
      this.targetElementHandle = element;
    }

  }

  async capture(page: Page, frameTime: number): Promise<Buffer> {
    if (this.targetElementHandle) {
      const box = await this.targetElementHandle.boundingBox();
      if (box) {
        const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', {
          screenshot: {
            format: this.cdpScreenshotParams.format,
            quality: this.cdpScreenshotParams.quality,
            clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 }
          },
          interval: this.frameInterval,
          frameTimeTicks: 10000 + frameTime
        } as any);
        if (res && res.screenshotData) {
          const buffer = Buffer.from(res.screenshotData, 'base64');
          this.lastFrameBuffer = buffer;
          return buffer;
        } else if (this.lastFrameBuffer) {
          return this.lastFrameBuffer;
        } else {
          this.lastFrameBuffer = this.emptyImageBuffer;
          return this.emptyImageBuffer;
        }
      }
      const fallback = await this.targetElementHandle.screenshot((this as any).fallbackScreenshotOptions);
      this.lastFrameBuffer = fallback as Buffer;
      return fallback as Buffer;
    }

    const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', {
      screenshot: this.cdpScreenshotParams,
      interval: this.frameInterval,
      frameTimeTicks: 10000 + frameTime
    } as any);
    if (res && res.screenshotData) {
      const buffer = Buffer.from(res.screenshotData, 'base64');
      this.lastFrameBuffer = buffer;
      return buffer;
    } else if (this.lastFrameBuffer) {
      return this.lastFrameBuffer;
    } else {
      this.lastFrameBuffer = this.emptyImageBuffer;
      return this.emptyImageBuffer;
    }
  }

  async finish(page: Page): Promise<void> {
    if (this.cdpSession) {
      this.cdpSession = null;
    }
  }

  getFFmpegArgs(options: RendererOptions, outputPath: string): FFmpegConfig {
    const videoInputArgs = [
      '-f', 'image2pipe',
      '-framerate', `${options.fps}`,
      '-i', '-',
    ];

    const combinedOptions: RendererOptions = {
      ...options,
      audioTracks: [
        ...(options.audioTracks || []),
        ...this.discoveredAudioTracks
      ]
    };

    return FFmpegBuilder.getArgs(combinedOptions, outputPath, videoInputArgs);
  }

  async cleanup(): Promise<void> {
    await Promise.resolve(this.cleanupAudio());
  }
}
