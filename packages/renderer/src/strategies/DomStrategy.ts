import { Page } from 'playwright';
import { RenderStrategy } from './RenderStrategy.js';
import { RendererOptions, AudioTrackConfig } from '../types.js';
import { FFmpegBuilder } from '../utils/FFmpegBuilder.js';
import { scanForAudioTracks } from '../utils/dom-scanner.js';
import { extractBlobTracks } from '../utils/blob-extractor.js';

export class DomStrategy implements RenderStrategy {
  private discoveredAudioTracks: AudioTrackConfig[] = [];
  private cleanupAudio: () => Promise<void> | void = () => {};

  constructor(private options: RendererOptions) {
    if (this.options.videoCodec === 'copy') {
      throw new Error("DomStrategy produces image sequences and cannot be used with 'copy' codec. Please use a transcoding codec like 'libx264' (default).");
    }
  }

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
        function findAllElements(root, elements) {
          elements = elements || [];
          if (root.nodeType === Node.ELEMENT_NODE) {
            elements.push(root);
          }
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
          while (walker.nextNode()) {
            const node = walker.currentNode;
            elements.push(node);
            if (node.shadowRoot) {
              findAllElements(node.shadowRoot, elements);
            }
          }
          return elements;
        }

        const allElements = findAllElements(document);
        const backgroundUrls = new Set();

        allElements.forEach((el) => {
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
    const initialTracks = await scanForAudioTracks(page);

    // Extract blobs to temp files
    const extractionResult = await extractBlobTracks(page, initialTracks);
    this.discoveredAudioTracks = extractionResult.tracks;
    this.cleanupAudio = extractionResult.cleanup;
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
    // No-op for DomStrategy (cleanup happens in cleanup())
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

  async cleanup(): Promise<void> {
    await Promise.resolve(this.cleanupAudio());
  }
}
