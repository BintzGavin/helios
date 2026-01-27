import { Page } from 'playwright';
import { RenderStrategy } from './RenderStrategy';
import { RendererOptions, AudioTrackConfig } from '../types';
import { FFmpegBuilder } from '../utils/FFmpegBuilder';

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
    const discoveredTracks = await page.evaluate(async () => {
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
      const backgroundUrls = new Set<string>();

      getAllElements().forEach((el) => {
        const style = window.getComputedStyle(el);
        const bgImage = style.backgroundImage;
        if (bgImage && bgImage !== 'none') {
          // Extract URLs from "url('...'), url("...")"
          // Note: This regex handles simple cases. Complex escaping might need a robust parser,
          // but getComputedStyle typically normalizes URLs.
          const matches = bgImage.matchAll(/url\((['"]?)(.*?)\1\)/g);
          for (const match of matches) {
            if (match[2]) {
              backgroundUrls.add(match[2]);
            }
          }
        }
      });

      if (backgroundUrls.size > 0) {
        console.log(`[DomStrategy] Preloading ${backgroundUrls.size} background images...`);
        await Promise.all(Array.from(backgroundUrls).map((url) => {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(undefined);
            img.onerror = () => {
              console.warn(`[DomStrategy] Failed to preload background image: ${url}`);
              resolve(undefined); // Don't block
            };
            img.src = url;
            if (img.complete) resolve(undefined);
          });
        }));
      }

      // 4. Wait for media elements (video/audio)
      const mediaElements = Array.from(document.querySelectorAll('video, audio')) as HTMLMediaElement[];
      const tracks: { path: string; volume: number }[] = [];

      if (mediaElements.length > 0) {
        console.log(`[DomStrategy] Preloading ${mediaElements.length} media elements...`);
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
                console.warn(`[DomStrategy] Timeout waiting for media element: ${el.currentSrc || el.src}`);
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
            tracks.push({
              path: src,
              volume: el.volume
            });
          }
        });
      }
      return tracks;
    });

    // Filter and map discovered tracks
    this.discoveredAudioTracks = discoveredTracks
      .filter(track => track.path && !track.path.startsWith('blob:'))
      .map(track => ({
        path: track.path,
        volume: track.volume,
      }));

    if (this.discoveredAudioTracks.length > 0) {
      console.log(`[DomStrategy] Discovered ${this.discoveredAudioTracks.length} audio/video tracks.`);
    }
  }

  async capture(page: Page, frameTime: number): Promise<Buffer> {
    const format = this.options.intermediateImageFormat || 'png';
    const quality = this.options.intermediateImageQuality;

    if (format === 'jpeg') {
      return await page.screenshot({ type: 'jpeg', quality: quality });
    } else {
      return await page.screenshot({ type: 'png' });
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
