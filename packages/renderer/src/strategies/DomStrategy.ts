import { Page, CDPSession } from 'playwright';
import { RenderStrategy } from './RenderStrategy.js';
import { RendererOptions, AudioTrackConfig, FFmpegConfig } from '../types.js';
import { FFmpegBuilder } from '../utils/FFmpegBuilder.js';
import { scanForAudioTracks } from '../utils/dom-scanner.js';
import { extractBlobTracks } from '../utils/blob-extractor.js';
import { FIND_DEEP_ELEMENT_SCRIPT } from '../utils/dom-finder.js';
import { PRELOAD_SCRIPT } from '../utils/dom-preload.js';

export class DomStrategy implements RenderStrategy {
  private discoveredAudioTracks: AudioTrackConfig[] = [];
  private cleanupAudio: () => Promise<void> | void = () => {};
  private cdpSession: CDPSession | null = null;
  private frameQueue: Buffer[] = [];
  private frameResolver: ((buffer: Buffer) => void) | null = null;
  private lastFrameBuffer: Buffer | null = null;

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

    this.cdpSession.on('Page.screencastFrame', (event: any) => {
      const buffer = Buffer.from(event.data, 'base64');
      this.cdpSession?.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});

      this.lastFrameBuffer = buffer;

      if (this.frameResolver) {
        this.frameResolver(buffer);
        this.frameResolver = null;
      } else {
        this.frameQueue.push(buffer);
      }
    });

    const format = this.options.intermediateImageFormat === 'jpeg' ? 'jpeg' : 'png';
    const quality = format === 'jpeg' ? (this.options.intermediateImageQuality || 100) : undefined;

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

    await this.cdpSession.send('Page.startScreencast', {
      format,
      quality,
    });
  }

  async capture(page: Page, frameTime: number): Promise<Buffer> {
    const format = this.options.intermediateImageFormat || 'png';
    const quality = this.options.intermediateImageQuality;
    const pixelFormat = this.options.pixelFormat || 'yuv420p';

    const screenshotOptions: any = {
      type: format,
    };

    if (format === 'jpeg') {
      screenshotOptions.quality = quality;
    } else {
      // Check if the requested pixel format supports alpha
      const hasAlpha = pixelFormat.includes('yuva') ||
                       pixelFormat.includes('rgba') ||
                       pixelFormat.includes('bgra') ||
                       pixelFormat.includes('argb') ||
                       pixelFormat.includes('abgr');
      screenshotOptions.omitBackground = hasAlpha;
    }

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
      return await element.screenshot(screenshotOptions);
    }

    if (this.frameQueue.length > 0) {
      return this.frameQueue.shift()!;
    }

    return new Promise<Buffer>((resolve, reject) => {
      this.frameResolver = resolve;

      // Wait for the browser to finish painting this frame's virtual time
      page.evaluate(() => new Promise(requestAnimationFrame)).then(() => {
        // rAF resolved. The browser has painted.
        // Give CDP a tiny bit of time to deliver the screencast event over IPC
        setTimeout(async () => {
          if (this.frameResolver === resolve) {
            this.frameResolver = null;
            if (this.lastFrameBuffer) {
              resolve(this.lastFrameBuffer);
            } else {
              try {
                if (this.cdpSession) {
                  const captureParams: any = { format };
                  if (format === 'jpeg' && quality !== undefined) {
                    captureParams.quality = quality;
                  }
                  const { data } = await this.cdpSession.send('Page.captureScreenshot', captureParams);
                  const fallback = Buffer.from(data, 'base64');
                  this.lastFrameBuffer = fallback;
                  resolve(fallback);
                } else {
                  const fallback = await page.screenshot(screenshotOptions);
                  this.lastFrameBuffer = fallback;
                  resolve(fallback);
                }
              } catch (err) {
                reject(err);
              }
            }
          }
        }, 50);
      }).catch((err) => {
        if (this.frameResolver === resolve) {
          this.frameResolver = null;
          reject(err);
        }
      });
    });
  }

  async finish(page: Page): Promise<void> {
    if (this.cdpSession) {
      await this.cdpSession.send('Page.stopScreencast').catch(() => {});
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
