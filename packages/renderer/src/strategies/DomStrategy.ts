import { Page } from 'playwright';
import { RenderStrategy } from './RenderStrategy.js';
import { RendererOptions, AudioTrackConfig } from '../types.js';
import { FFmpegBuilder } from '../utils/FFmpegBuilder.js';
import { scanForAudioTracks } from '../utils/dom-scanner.js';

export class DomStrategy implements RenderStrategy {
  private discoveredAudioTracks: AudioTrackConfig[] = [];

  constructor(private options: RendererOptions) {}

  async diagnose(page: Page): Promise<any> {
    return await page.evaluate(() => {
      console.log('[Helios Diagnostics] Checking DOM environment...');
      const report = {
        waapi: typeof document !== 'undefined' && 'timeline' in document,
        animations: typeof document.getAnimations === 'function' ? 'supported' : 'unsupported',
        userAgent: navigator.userAgent,
      };
      return report;
    });
  }

  async prepare(page: Page): Promise<void> {
    const script = `
      (async () => {
        // 1. Wait for fonts
        await document.fonts.ready;

        // 2. Wait for images
        const images = Array.from(document.images);
        await Promise.all(images.map((img) => {
          if (img.complete) return;
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve; // Don't block on broken images
          });
        }));

        // 3. Wait for CSS background images
        const getAllElements = () => Array.from(document.querySelectorAll('*'));
        const backgroundUrls = new Set();

        getAllElements().forEach((el) => {
          const style = window.getComputedStyle(el);
          const bgImage = style.backgroundImage;
          if (bgImage && bgImage !== 'none') {
            // Extract URLs from "url('...'), url("...")"
            const matches = bgImage.matchAll(/url\\((['"]?)(.*?)\\1\\)/g);
            for (const match of matches) {
              if (match[2]) {
                backgroundUrls.add(match[2]);
              }
            }
          }
        });

        if (backgroundUrls.size > 0) {
          console.log('[DomStrategy] Preloading ' + backgroundUrls.size + ' background images...');
          await Promise.all(Array.from(backgroundUrls).map((url) => {
            return new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve(undefined);
              img.onerror = () => {
                console.warn('[DomStrategy] Failed to preload background image: ' + url);
                resolve(undefined); // Don't block
              };
              img.src = url;
              if (img.complete) resolve(undefined);
            });
          }));
        }

      })()
    `;

    // Execute preloading script in all frames
    await Promise.all(page.frames().map(frame =>
      frame.evaluate(script)
    ));

    // Scan for audio tracks using the shared utility
    this.discoveredAudioTracks = await scanForAudioTracks(page);
  }

  async capture(page: Page, frameTime: number): Promise<Buffer> {
    const format = this.options.intermediateImageFormat || 'png';
    const quality = this.options.intermediateImageQuality;
    const pixelFormat = this.options.pixelFormat || 'yuv420p';

    if (format === 'jpeg') {
      return await page.screenshot({ type: 'jpeg', quality: quality });
    } else {
      // Check if the requested pixel format supports alpha
      const hasAlpha = pixelFormat.includes('yuva') ||
                       pixelFormat.includes('rgba') ||
                       pixelFormat.includes('bgra') ||
                       pixelFormat.includes('argb') ||
                       pixelFormat.includes('abgr');

      return await page.screenshot({
        type: 'png',
        omitBackground: hasAlpha
      });
    }
  }

  async finish(page: Page): Promise<void> {
    // No-op for DomStrategy
    return Promise.resolve();
  }

  getFFmpegArgs(options: RendererOptions, outputPath: string): string[] {
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
}
