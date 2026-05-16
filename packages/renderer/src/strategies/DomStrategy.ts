import { Page, CDPSession } from 'playwright';
import { RenderStrategy } from './RenderStrategy.js';
import { RendererOptions, AudioTrackConfig, FFmpegConfig } from '../types.js';
import { FFmpegBuilder } from '../utils/FFmpegBuilder.js';
import { scanForAudioTracks } from '../utils/dom-scanner.js';
import { extractBlobTracks } from '../utils/blob-extractor.js';
import { PRELOAD_SCRIPT } from '../utils/dom-preload.js';

const EMPTY_IMAGE_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2NkYGD4z8DAwMgAI0AMDA4wBfQoO4UAAAAASUVORK5CYII=",
  "base64"
);

export class DomStrategy implements RenderStrategy {
  private discoveredAudioTracks: AudioTrackConfig[] = [];
  private cleanupAudio: () => Promise<void> | void = () => {};
  private cdpSession: CDPSession | null = null;
  private lastFrameData: Buffer | string | null = null;
  private elementScreenshotParams: any = null;

  private cdpScreenshotParams: any = null;
  private targetElementHandle: any = null;
  private emptyImageBuffer: Buffer = EMPTY_IMAGE_BUFFER;
  private emptyImageBase64: string = "";
  private frameInterval: number = 0;
  private beginFrameParams: any = { interval: 0, frameTimeTicks: 0, screenshot: null };
  private targetBeginFrameParams: any = null;

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
        format = 'png';
      } else {
        format = 'jpeg';
        quality = quality ?? 90;
      }
    }

    const cdpScreenshotParams: any = { format, optimizeForSpeed: true };
    if ((format === 'jpeg' || format === 'webp') && quality !== undefined) {
      cdpScreenshotParams.quality = quality;
    }

    this.frameInterval = 1000 / this.options.fps;
    this.beginFrameParams.interval = this.frameInterval;
    this.cdpScreenshotParams = cdpScreenshotParams;
    this.beginFrameParams.screenshot = cdpScreenshotParams;

    this.targetBeginFrameParams = {
      screenshot: {
        format: cdpScreenshotParams.format,
        quality: cdpScreenshotParams.quality,
        clip: { x: 0, y: 0, width: 0, height: 0, scale: 1 }
      },
      interval: this.frameInterval,
      frameTimeTicks: 0
    };

    // Set format-appropriate empty buffer
    if (format === 'jpeg') {
        // 2x2 JPEG pixel
        this.emptyImageBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAACAAIBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
        this.emptyImageBuffer = Buffer.from(this.emptyImageBase64, 'base64');
    } else if (format === 'webp') {
        // 2x2 WEBP pixel
        this.emptyImageBase64 = 'UklGRjIAAABXRUJQVlA4ICYAAAAwAQCdASoCAAIACgEAAwBkAGsAIP4B2gAAACH+/4IAAA==';
        this.emptyImageBuffer = Buffer.from(this.emptyImageBase64, 'base64');
    } else {
        // Default to PNG
        this.emptyImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2NkYGD4z8DAwMgAI0AMDA4wBfQoO4UAAAAASUVORK5CYII=";
        this.emptyImageBuffer = EMPTY_IMAGE_BUFFER;
    }

    this.lastFrameData = this.emptyImageBase64;




    if (this.options.targetSelector) {
      const element = await page.waitForSelector(this.options.targetSelector, { state: 'attached', timeout: 5000 }).catch(() => null);
      if (!element) {
        throw new Error(`Target element not found: ${this.options.targetSelector}`);
      }
      this.targetElementHandle = element;
    }


  }


  async capture(page: Page, frameTime: number): Promise<Buffer | string> {
    if (this.targetElementHandle) {
      const box = await this.targetElementHandle.boundingBox();
      if (!box) {
         return this.lastFrameData!;
      }

      this.targetBeginFrameParams.screenshot.clip.x = box.x;
      this.targetBeginFrameParams.screenshot.clip.y = box.y;
      this.targetBeginFrameParams.screenshot.clip.width = box.width;
      this.targetBeginFrameParams.screenshot.clip.height = box.height;
      this.targetBeginFrameParams.frameTimeTicks = 10000 + frameTime;

      try {
        const result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams);
        const frameData = result.screenshotData || this.lastFrameData!;
        this.lastFrameData = frameData;
        return frameData;
      } catch (e) {
        return this.lastFrameData!;
      }
    }

    this.beginFrameParams.frameTimeTicks = 10000 + frameTime;

    try {
      const result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
      const frameData = result.screenshotData || this.lastFrameData!;
      this.lastFrameData = frameData;
      return frameData;
    } catch (e) {
      return this.lastFrameData!;
    }
  }

  async finish(page: Page): Promise<void> {
    if (this.cdpSession) {
      this.cdpSession = null;
    }
  }

  getFFmpegArgs(options: RendererOptions, outputPath: string): FFmpegConfig {
    let inputFormat = 'image2pipe';
    const format = this.cdpScreenshotParams?.format || 'png';

    if (format === 'webp') {
      inputFormat = 'image2pipe';
    } else if (format === 'jpeg') {
      inputFormat = 'mjpeg';
    } else if (format === 'png') {
       inputFormat = 'image2pipe';
    }

    const videoInputArgs = [
      '-f', inputFormat,
      ...(format === 'webp' ? ['-vcodec', 'webp'] : []),
      '-framerate', `${options.fps}`,
      '-thread_queue_size', '512',
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
