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
  private beginFrameParams: any = null;
  private beginFrameTargetParams: any = null;
  private targetElementHandle: any = null;
  private emptyImageBuffer: Buffer = EMPTY_IMAGE_BUFFER;

  private bufferPool: Buffer[] = Array.from({ length: 10 }, () => Buffer.allocUnsafe(1920 * 1080 * 2));
  private bufferIndex: number = 0;


  private writeToBufferPool(screenshotData: string): Buffer {
    const maxByteLen = (screenshotData.length * 3) >>> 2;
    let captureBuffer = this.bufferPool[this.bufferIndex];
    if (captureBuffer.length < maxByteLen) {
        captureBuffer = Buffer.allocUnsafe(Math.max(maxByteLen + 1024 * 1024, 1920 * 1080 * 2));
        this.bufferPool[this.bufferIndex] = captureBuffer;
    }
    const bytesWritten = captureBuffer.write(screenshotData, 'base64');
    const buffer = captureBuffer.subarray(0, bytesWritten);
    this.bufferIndex = (this.bufferIndex + 1) % 10;
    return buffer;
  }

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
    await Promise.all(page.frames().map(frame =>
      frame.evaluate(script)
    ));

    // Scan for audio tracks using the shared utility
    const initialTracks = await scanForAudioTracks(page, timeout);

    // Extract blobs to temp files
    const extractionResult = await extractBlobTracks(page, initialTracks);
    this.discoveredAudioTracks = extractionResult.tracks;
    this.cleanupAudio = extractionResult.cleanup;

    this.cdpSession = await page.context().newCDPSession(page);
    await this.cdpSession.send('HeadlessExperimental.enable');

    // Check if the requested pixel format supports alpha
    const pixelFormat = this.options.pixelFormat || 'yuv420p';
    const hasAlpha = pixelFormat.includes('yuva') ||
                     pixelFormat.includes('rgba') ||
                     pixelFormat.includes('bgra') ||
                     pixelFormat.includes('argb') ||
                     pixelFormat.includes('abgr');

    // Emulate Browser.setDownloadBehavior/etc or use Emulation to set transparent background
    if (hasAlpha) {
      await this.cdpSession.send('Emulation.setDefaultBackgroundColorOverride', {
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

    this.cdpScreenshotParams = cdpScreenshotParams;
    this.beginFrameParams = { screenshot: this.cdpScreenshotParams };
    this.beginFrameTargetParams = { screenshot: { ...this.cdpScreenshotParams, clip: { x: 0, y: 0, width: 0, height: 0, scale: 1 } } };

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
      if (this.cdpSession) {
        const box = await this.targetElementHandle.boundingBox();
        if (box) {
          this.beginFrameTargetParams.screenshot.clip.x = box.x;
          this.beginFrameTargetParams.screenshot.clip.y = box.y;
          this.beginFrameTargetParams.screenshot.clip.width = box.width;
          this.beginFrameTargetParams.screenshot.clip.height = box.height;

          const { screenshotData } = await this.cdpSession.send('HeadlessExperimental.beginFrame', this.beginFrameTargetParams);

          if (screenshotData) {
            const buffer = this.writeToBufferPool(screenshotData);
            this.lastFrameBuffer = buffer;
            return buffer;
          } else if (this.lastFrameBuffer) {
            return this.lastFrameBuffer;
          } else {
            // Wait for next explicit tick or fallback if damage driven logic fails
            // When beginFrame is active, Page.captureScreenshot hangs.
            // But if we're here, it means the frame was omitted. Let's just create an empty buffer
            // to avoid hanging
            this.lastFrameBuffer = this.emptyImageBuffer;
            return this.emptyImageBuffer;
          }
        }
      }

      const fallback = await this.targetElementHandle.screenshot((this as any).fallbackScreenshotOptions);
      this.lastFrameBuffer = fallback;
      return fallback;
    }

    try {
      if (this.cdpSession) {
        const { screenshotData } = await this.cdpSession.send('HeadlessExperimental.beginFrame', this.beginFrameParams);

        if (screenshotData) {
          const buffer = this.writeToBufferPool(screenshotData);
          this.lastFrameBuffer = buffer;
          return buffer;
        } else if (this.lastFrameBuffer) {
          // Chromium detected no visual damage and omitted the screenshot.
          // Reuse the last successfully captured frame for the video stream.
          return this.lastFrameBuffer;
        } else {
          // If no damage was detected but we don't have a previous frame (e.g., frame 0),
          // fallback to a standard CDP capture to guarantee an initial frame buffer.
          this.lastFrameBuffer = EMPTY_IMAGE_BUFFER;
          return EMPTY_IMAGE_BUFFER;
        }
      } else {
        const fallback = await page.screenshot((this as any).fallbackScreenshotOptions);
        this.lastFrameBuffer = fallback;
        return fallback;
      }
    } catch (err) {
      throw err;
    }
  }

  async finish(page: Page): Promise<void> {
    if (this.cdpSession) {
      await this.cdpSession.detach().catch(() => {});
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
