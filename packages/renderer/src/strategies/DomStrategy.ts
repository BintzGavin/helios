import { Page } from 'playwright';
import { RenderStrategy } from './RenderStrategy';
import { RendererOptions } from '../types';

export class DomStrategy implements RenderStrategy {
  async diagnose(page: Page): Promise<void> {
    await page.evaluate(() => {
      console.log('[Helios Diagnostics] Checking DOM environment...');
      const report = {
        waapi: typeof document !== 'undefined' && 'timeline' in document,
        animations: typeof document.getAnimations === 'function' ? 'supported' : 'unsupported',
        userAgent: navigator.userAgent,
      };
      console.log(JSON.stringify(report, null, 2));
    });
  }

  async prepare(page: Page): Promise<void> {
    await page.evaluate(async () => {
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
      }
    });
  }

  async capture(page: Page, frameTime: number): Promise<Buffer> {
    return await page.screenshot({ type: 'png' });
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

    let audioInputArgs: string[] = [];
    if (options.audioFilePath) {
      if (options.startFrame && options.startFrame > 0) {
        const startTime = options.startFrame / options.fps;
        audioInputArgs = ['-ss', startTime.toString(), '-i', options.audioFilePath];
      } else {
        audioInputArgs = ['-i', options.audioFilePath];
      }
    }

    // Use -t instead of -shortest to ensure video duration matches exact animation length,
    // even if audio is shorter (silence) or longer (cut).
    const audioOutputArgs = options.audioFilePath
      ? ['-c:a', 'aac', '-map', '0:v', '-map', '1:a', '-t', options.durationInSeconds.toString()]
      : [];

    const videoCodec = options.videoCodec || 'libx264';
    const pixelFormat = options.pixelFormat || 'yuv420p';

    const encodingArgs: string[] = [
      '-c:v', videoCodec,
      '-pix_fmt', pixelFormat,
      '-movflags', '+faststart',
    ];

    if (options.crf !== undefined) {
      encodingArgs.push('-crf', options.crf.toString());
    }

    if (options.preset) {
      encodingArgs.push('-preset', options.preset);
    }

    if (options.videoBitrate) {
      encodingArgs.push('-b:v', options.videoBitrate);
    }

    const outputArgs = [
      ...encodingArgs,
      ...audioOutputArgs,
      outputPath,
    ];

    return ['-y', ...videoInputArgs, ...audioInputArgs, ...outputArgs];
  }
}
