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
  private lastFrameData: Buffer | string | null = null;

  private cdpScreenshotParams: any = null;
  private beginFrameParams: any = null;
  private targetBeginFrameParams: any = null;
  private targetElementHandle: any = null;
  private emptyImageBuffer: Buffer = EMPTY_IMAGE_BUFFER;
  private emptyImageBase64: string = "";
  private frameInterval: number = 0;

  public formatResponse = (res: any): Buffer | string => {
    if (res && res.screenshotData) {
      this.lastFrameData = res.screenshotData;
      return res.screenshotData;
    } else if (Buffer.isBuffer(res)) {
      this.lastFrameData = res;
      return res;
    } else if (this.lastFrameData) {
      return this.lastFrameData;
    } else {
      this.lastFrameData = this.emptyImageBase64;
      return this.emptyImageBase64;
    }
  };

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
        this.emptyImageBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
        this.emptyImageBuffer = Buffer.from(this.emptyImageBase64, 'base64');
    } else if (format === 'webp') {
        // 1x1 WEBP pixel
        this.emptyImageBase64 = 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
        this.emptyImageBuffer = Buffer.from(this.emptyImageBase64, 'base64');
    } else {
        // Default to PNG
        this.emptyImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
        this.emptyImageBuffer = EMPTY_IMAGE_BUFFER;
    }

    // We also save screenshotOptions on this since fallback uses it, though we could just keep it local if not used in capture.
    // Actually fallback is used in capture when CDP is unavailable. Let's add it to this.
    (this as any).fallbackScreenshotOptions = screenshotOptions;

    this.beginFrameParams = {
      screenshot: this.cdpScreenshotParams,
      interval: this.frameInterval,
      frameTimeTicks: 0
    };

    this.targetBeginFrameParams = {
      screenshot: {
        format: this.cdpScreenshotParams.format,
        quality: this.cdpScreenshotParams.quality,
        clip: { x: 0, y: 0, width: 0, height: 0, scale: 1 }
      },
      interval: this.frameInterval,
      frameTimeTicks: 0
    };


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

      const box = await this.targetElementHandle.boundingBox();
      if (box) {
        this.targetBeginFrameParams.screenshot.clip.x = box.x;
        this.targetBeginFrameParams.screenshot.clip.y = box.y;
        this.targetBeginFrameParams.screenshot.clip.width = box.width;
        this.targetBeginFrameParams.screenshot.clip.height = box.height;
      } else {
        console.warn(`Could not determine bounding box for target element: ${this.options.targetSelector}`);
      }
    }


  }


  capture(page: Page, frameTime: number): Promise<any> {
    if (this.targetElementHandle) {
      if (this.targetBeginFrameParams.screenshot.clip.width > 0) {
        this.targetBeginFrameParams.frameTimeTicks = 10000 + frameTime;

        return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams);
      }
      return this.targetElementHandle.screenshot((this as any).fallbackScreenshotOptions);
    }

    this.beginFrameParams.frameTimeTicks = 10000 + frameTime;
    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
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
      inputFormat = 'webp_pipe';
    } else if (format === 'jpeg') {
      inputFormat = 'mjpeg';
    } else if (format === 'png') {
       inputFormat = 'image2pipe';
    }

    const videoInputArgs = [
      '-f', inputFormat,
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
