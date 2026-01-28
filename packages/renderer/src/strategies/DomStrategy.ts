import { Page } from 'playwright';
import { RenderStrategy } from './RenderStrategy.js';
import { RendererOptions, AudioTrackConfig } from '../types.js';
import { FFmpegBuilder } from '../utils/FFmpegBuilder.js';

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

        // 4. Wait for media elements (video/audio)
        const mediaElements = Array.from(document.querySelectorAll('video, audio'));
        const tracks = [];

        if (mediaElements.length > 0) {
          console.log('[DomStrategy] Preloading ' + mediaElements.length + ' media elements...');
          await Promise.all(mediaElements.map((el) => {
            // Check if already ready (HAVE_ENOUGH_DATA = 4)
            if (el.readyState >= 4) return;

            return new Promise((resolve) => {
              let resolved = false;
              const finish = () => {
                if (resolved) return;
                resolved = true;
                resolve(undefined);
              };

              el.addEventListener('canplaythrough', finish, { once: true });
              el.addEventListener('error', finish, { once: true });

              // Force load if needed (e.g. if preload="none")
              if (el.preload === 'none') {
                el.preload = 'auto';
              }

              // Timeout fallback (e.g., 10 seconds)
              setTimeout(() => {
                if (!resolved) {
                  console.warn('[DomStrategy] Timeout waiting for media element: ' + (el.currentSrc || el.src));
                  finish();
                }
              }, 10000);
            });
          }));
          console.log('[DomStrategy] Media elements ready.');

          // Extract metadata
          mediaElements.forEach(el => {
            const src = el.currentSrc || el.src;
            if (src) {
              // Parse attributes
              const offset = el.dataset.heliosOffset ? parseFloat(el.dataset.heliosOffset) : 0;
              const seek = el.dataset.heliosSeek ? parseFloat(el.dataset.heliosSeek) : 0;
              const volume = el.muted ? 0 : el.volume;

              tracks.push({
                path: src,
                volume: volume,
                offset: isNaN(offset) ? 0 : offset,
                seek: isNaN(seek) ? 0 : seek
              });
            }
          });
        }
        return tracks;
      })()
    `;

    // Execute in all frames
    const results = await Promise.all(page.frames().map(frame =>
      frame.evaluate(script) as Promise<any[]>
    ));

    // Flatten results
    const discoveredTracks = results.flat();

    // Filter and map discovered tracks
    this.discoveredAudioTracks = discoveredTracks
      .filter(track => track.path && !track.path.startsWith('blob:'))
      .map(track => ({
        path: track.path,
        volume: track.volume,
        offset: track.offset,
        seek: track.seek,
      }));

    if (this.discoveredAudioTracks.length > 0) {
      console.log(`[DomStrategy] Discovered ${this.discoveredAudioTracks.length} audio/video tracks across ${page.frames().length} frames.`);
    }
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
