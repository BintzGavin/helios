import { Page } from 'playwright';
import { RenderStrategy } from './RenderStrategy.js';
import { RendererOptions, AudioTrackConfig, FFmpegConfig } from '../types.js';
import { FFmpegBuilder } from '../utils/FFmpegBuilder.js';
import { scanForAudioTracks } from '../utils/dom-scanner.js';
import { extractBlobTracks } from '../utils/blob-extractor.js';

export class CanvasStrategy implements RenderStrategy {
  private useWebCodecs = false;
  private useH264 = false;
  private discoveredAudioTracks: AudioTrackConfig[] = [];
  private cleanupAudio: () => Promise<void> | void = () => {};

  constructor(private options: RendererOptions) {}

  private parseBitrate(bitrate: string): number {
    const match = bitrate.match(/^(\d+)([kmg]?)$/i);
    if (!match) return 0;
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    switch (unit) {
      case 'k': return value * 1_000;
      case 'm': return value * 1_000_000;
      case 'g': return value * 1_000_000_000;
      default: return value;
    }
  }

  async diagnose(page: Page): Promise<any> {
    return await page.evaluate(async function() {
      console.log('[Helios Diagnostics] Checking Canvas environment...');

      const configs = [
        { id: 'h264', config: { codec: 'avc1.4d002a', width: 1920, height: 1080, avc: { format: 'annexb' } } }, // H.264 High Profile
        { id: 'vp8', config: { codec: 'vp8', width: 1920, height: 1080 } },
        { id: 'vp9', config: { codec: 'vp9', width: 1920, height: 1080 } },
        { id: 'av1', config: { codec: 'av01.0.08M.08', width: 1920, height: 1080 } }
      ];

      const codecs: Record<string, any> = {};
      const videoEncoderSupported = typeof VideoEncoder !== 'undefined';

      // Initialize with default values
      for (const c of configs) {
        codecs[c.id] = { supported: false, hardware: false, alpha: false, type: 'unknown' };
      }

      if (videoEncoderSupported) {
        for (const c of configs) {
          try {
            // Check base support (no alpha)
            const baseConfig = { ...c.config, alpha: 'discard' };
            // @ts-ignore
            const support = await VideoEncoder.isConfigSupported(baseConfig);

            if (support.supported) {
               codecs[c.id].supported = true;
               // Check for 'type' (hardware/software) support (Chrome 106+)
               // @ts-ignore
               if (support.type) {
                 // @ts-ignore
                 codecs[c.id].type = support.type;
                 // @ts-ignore
                 codecs[c.id].hardware = (support.type === 'hardware');
               }

               // Check Alpha
               try {
                 const alphaConfig = { ...c.config, alpha: 'keep' };
                 // @ts-ignore
                 const alphaSupport = await VideoEncoder.isConfigSupported(alphaConfig);
                 if (alphaSupport.supported) {
                   codecs[c.id].alpha = true;
                 }
               } catch (e) {
                 // Alpha check failed
               }
            }
          } catch (e) {
            // Codec check failed
          }
        }
      }

      const report = {
        videoEncoder: videoEncoderSupported,
        offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
        userAgent: navigator.userAgent,
        codecs
      };
      return report;
    });
  }

  async prepare(page: Page): Promise<void> {
    // Ensure fonts are loaded before capture starts
    await page.evaluate(function() { return document.fonts.ready; });

    // Validate that the canvas element exists (supporting Shadow DOM)
    // We use a string-based script to avoid transpiler artifacts (like esbuild's __name)
    const selector = this.options.canvasSelector || 'canvas';
    const findCanvasScript = `
      ((selector) => {
        function findCanvas(root, selector) {
          // Fast path for Light DOM (if querySelector is available)
          // Note: querySelector does NOT cross shadow boundaries
          if (root.querySelector) {
            try {
              const light = root.querySelector(selector);
              if (light && light instanceof HTMLCanvasElement) return light;
            } catch (e) {
              // Ignore invalid selector errors
            }
          }

          // Recursive traversal
          // We use createTreeWalker to iterate descendants
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
          while (walker.nextNode()) {
            const node = walker.currentNode;

            if (node instanceof HTMLCanvasElement) {
              if (node.matches && node.matches(selector)) {
                return node;
              }
            }

            if (node.shadowRoot) {
              const found = findCanvas(node.shadowRoot, selector);
              if (found) return found;
            }
          }
          return null;
        }

        const canvas = findCanvas(document, selector);
        if (canvas) {
          window.__HELIOS_TARGET_CANVAS__ = canvas;
          return true;
        }
        return false;
      })(${JSON.stringify(selector)})
    `;

    const canvasFound = await page.evaluate(findCanvasScript);

    if (!canvasFound) {
      throw new Error(`Canvas not found matching selector: ${selector}`);
    }

    // Scan for audio tracks using the shared utility
    const initialTracks = await scanForAudioTracks(page);

    // Extract blobs to temp files
    const extractionResult = await extractBlobTracks(page, initialTracks);
    this.discoveredAudioTracks = extractionResult.tracks;
    this.cleanupAudio = extractionResult.cleanup;

    // Detect WebCodecs support and initialize if possible
    const width = page.viewportSize()?.width || 1920;
    const height = page.viewportSize()?.height || 1080;

    // Calculate intermediate bitrate
    let targetBitrate = 0;
    if (this.options.videoBitrate) {
      targetBitrate = this.parseBitrate(this.options.videoBitrate);
    }

    // Heuristic: 0.2 bits per pixel per frame (approx high quality)
    // 1920x1080 @ 60fps ~= 25 Mbps
    // 3840x2160 @ 60fps ~= 100 Mbps
    // Actually 0.2 bpp is very high quality for H.264/VP9.
    const fps = this.options.fps || 60;
    const autoBitrate = Math.floor(width * height * fps * 0.2);

    const intermediateBitrate = Math.max(25_000_000, targetBitrate, autoBitrate);

    // --- Smart Codec Selection ---

    interface Candidate {
        codecString: string;
        fourCC: string;
        isH264: boolean;
    }

    const candidates: Candidate[] = [];

    const addCandidate = (inputCodec: string) => {
        let codecString = inputCodec;
        let fourCC = 'VP80';
        let isH264 = false;

        const lower = inputCodec.toLowerCase();

        if (lower.startsWith('avc1') || lower.startsWith('h264')) {
             isH264 = true;
             codecString = inputCodec;
        } else if (lower === 'vp9' || lower.startsWith('vp9')) {
             codecString = 'vp9';
             fourCC = 'VP90';
        } else if (lower === 'av1' || lower.startsWith('av01')) {
             if (lower.startsWith('av01')) codecString = inputCodec;
             else codecString = 'av01.0.05M.08';
             fourCC = 'AV01';
        } else {
             // Default / VP8 / Unknown
             // Infer FourCC if possible
             if (lower.startsWith('vp9')) fourCC = 'VP90';
             else if (lower.startsWith('av01')) fourCC = 'AV01';
             else codecString = inputCodec; // Pass through unknown
        }

        candidates.push({ codecString, fourCC, isH264 });
    };

    if (this.options.intermediateVideoCodec) {
        addCandidate(this.options.intermediateVideoCodec);
    } else if (this.options.videoCodec === 'copy') {
        // Smart Selection for Copy Mode
        // Prioritize H.264 (AVC) -> VP9 -> AV1 -> VP8
        addCandidate('avc1.4d002a'); // H.264 High Profile
        addCandidate('vp9');
        addCandidate('av01.0.05M.08'); // AV1
        addCandidate('vp8');
    } else {
        // Default behavior
        // Prioritize H.264 (Hardware) -> VP9 -> AV1 -> VP8
        addCandidate('avc1.4d002a');
        addCandidate('vp9');
        addCandidate('av01.0.05M.08');
        addCandidate('vp8');
    }

    // Determine alpha mode
    const pixelFormat = this.options.pixelFormat || 'yuv420p';
    const hasAlpha = pixelFormat.startsWith('yuva') ||
                     pixelFormat.includes('rgba') ||
                     pixelFormat.includes('bgra') ||
                     pixelFormat.includes('argb') ||
                     pixelFormat.includes('abgr');
    const alphaMode = hasAlpha ? 'keep' : 'discard';

    const args = {
        width,
        height,
        bitrate: intermediateBitrate,
        candidates,
        alphaMode
    };

    const result = await page.evaluate<{ supported: boolean; codec?: string; isH264: boolean; reason?: string }>(`
      (async (config) => {
        if (typeof VideoEncoder === 'undefined') {
          return { supported: false, reason: 'VideoEncoder not found' };
        }

        let selected = null;
        for (const candidate of config.candidates) {
            const encoderConfig = {
              codec: candidate.codecString,
              width: config.width,
              height: config.height,
              bitrate: config.bitrate,
              alpha: config.alphaMode,
            };

            if (candidate.isH264) {
               encoderConfig.avc = { format: 'annexb' };
            }

            try {
              const support = await VideoEncoder.isConfigSupported(encoderConfig);
              if (support.supported) {
                  selected = { supported: true, config: encoderConfig, candidate };
                  break;
              }
            } catch (e) {
               // Ignore error
            }
        }

        if (!selected) {
            return { supported: false, reason: 'No supported codec found among candidates' };
        }

        const { config: encoderConfig, candidate: selectedCandidate } = selected;

        // Initialize global state for accumulation
        window.heliosWebCodecs = {
          chunks: [], // Array of ArrayBuffers
          error: null,
        };

        if (!selectedCandidate.isH264) {
          // Create IVF File Header (32 bytes)
          // Little-endian
          const ivfHeader = new ArrayBuffer(32);
          const view = new DataView(ivfHeader);
          // 0-3: 'DKIF'
          view.setUint8(0, 'D'.charCodeAt(0));
          view.setUint8(1, 'K'.charCodeAt(0));
          view.setUint8(2, 'I'.charCodeAt(0));
          view.setUint8(3, 'F'.charCodeAt(0));
          // 4-5: Version 0
          view.setUint16(4, 0, true);
          // 6-7: Header length 32
          view.setUint16(6, 32, true);

          // 8-11: FourCC
          const fourCCStr = selectedCandidate.fourCC;
          view.setUint8(8, fourCCStr.charCodeAt(0));
          view.setUint8(9, fourCCStr.charCodeAt(1));
          view.setUint8(10, fourCCStr.charCodeAt(2));
          view.setUint8(11, fourCCStr.charCodeAt(3));

          // 12-13: Width
          view.setUint16(12, config.width, true);
          // 14-15: Height
          view.setUint16(14, config.height, true);
          // 16-19: Rate (1,000,000) - To match microsecond timestamps from VideoEncoder
          view.setUint32(16, 1000000, true);
          // 20-23: Scale (1)
          view.setUint32(20, 1, true);
          // 24-27: Frame count (placeholder, updated later or ignored)
          view.setUint32(24, 0, true);

          window.heliosWebCodecs.chunks.push(ivfHeader);
        }

        const encoder = new VideoEncoder({
          output: (chunk, meta) => {
            const context = window.heliosWebCodecs;

            if (!selectedCandidate.isH264) {
              // Create IVF Frame Header (12 bytes)
              const frameHeader = new ArrayBuffer(12);
              const view = new DataView(frameHeader);

              // 0-3: Frame size in bytes
              view.setUint32(0, chunk.byteLength, true);

              // 4-11: Timestamp (64-bit)
              // chunk.timestamp is in microseconds.
              view.setBigUint64(4, BigInt(chunk.timestamp || 0), true);

              context.chunks.push(frameHeader);
            }

            const chunkData = new ArrayBuffer(chunk.byteLength);
            chunk.copyTo(chunkData);
            context.chunks.push(chunkData);
          },
          error: (e) => {
            console.error('VideoEncoder error:', e);
            window.heliosWebCodecs.error = e.message || 'Unknown VideoEncoder error';
          },
        });

        encoder.configure(encoderConfig);
        window.heliosWebCodecs.encoder = encoder;

        return {
            supported: true,
            codec: encoderConfig.codec,
            isH264: selectedCandidate.isH264
        };
      })(${JSON.stringify(args)})
    `);

    if (result.supported) {
      this.useWebCodecs = true;
      this.useH264 = result.isH264;
      console.log(`CanvasStrategy: Using WebCodecs (${result.codec}) with bitrate: ${intermediateBitrate}, alpha: ${alphaMode}`);
    } else {
      this.useWebCodecs = false;
      console.log(`CanvasStrategy: WebCodecs not available (${result.reason}). Falling back to toDataURL.`);

      if (this.options.videoCodec === 'copy') {
        throw new Error("CanvasStrategy failed to initialize WebCodecs and fell back to image capture, which cannot be used with 'copy' codec. Ensure VideoEncoder is supported or use a transcoding codec.");
      }
    }
  }

  async capture(page: Page, frameTime: number): Promise<Buffer> {
    if (this.useWebCodecs) {
      return this.captureWebCodecs(page, frameTime);
    } else {
      return this.captureCanvas(page, frameTime);
    }
  }

  private async captureWebCodecs(page: Page, frameTime: number): Promise<Buffer> {
    const selector = this.options.canvasSelector || 'canvas';

    const chunkData = await page.evaluate<string, { time: number; selector: string }>(async function(args) {
      const context = (window as any).heliosWebCodecs;

      if (context.error) {
        throw new Error(`WebCodecs Error: ${context.error}`);
      }

      const encoder = context.encoder as VideoEncoder;
      const canvas = (window as any).__HELIOS_TARGET_CANVAS__ as HTMLCanvasElement;

      if (!canvas) throw new Error(`Canvas not found (lost reference) matching selector: ${args.selector}`);

      // Create Frame and Encode
      const frame = new VideoFrame(canvas, { timestamp: args.time * 1000 }); // microseconds
      encoder.encode(frame, { keyFrame: (args.time === 0) });
      frame.close();

      // 3. Collect Chunks
      // Note: VideoEncoder is async. encode() might not output immediately.
      // But we just collect whatever is in the queue.
      // If nothing is in the queue, we return empty.

      const chunks = context.chunks;
      if (chunks.length === 0) {
        return ''; // Return empty string
      }

      // Optimize transfer using Blob and FileReader
      const blob = new Blob(chunks, { type: 'application/octet-stream' });
      context.chunks = []; // Clear buffer immediately

      return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
              const result = reader.result as string;
              // result format: "data:application/octet-stream;base64,ABC..."
              const base64 = result.split(',')[1];
              resolve(base64);
          };
          reader.onerror = () => reject(new Error('Failed to read blob'));
          reader.readAsDataURL(blob);
      });

    }, { time: frameTime, selector });

    if (chunkData && chunkData.length > 0) {
        return Buffer.from(chunkData, 'base64');
    }
    return Buffer.alloc(0);
  }

  private async captureCanvas(page: Page, frameTime: number): Promise<Buffer> {
    const format = this.options.intermediateImageFormat || 'png';
    const quality = this.options.intermediateImageQuality;
    const selector = this.options.canvasSelector || 'canvas';

    const dataUrl = await page.evaluate(function(args: { format: string, quality?: number, selector: string }) {
      const canvas = (window as any).__HELIOS_TARGET_CANVAS__ as HTMLCanvasElement;
      if (!canvas) return 'error:canvas-not-found';

      const mimeType = args.format === 'jpeg' ? 'image/jpeg' : 'image/png';

      if (args.format === 'jpeg' && typeof args.quality === 'number') {
        // canvas.toDataURL takes quality as 0.0 - 1.0
        return canvas.toDataURL(mimeType, args.quality / 100);
      }

      return canvas.toDataURL(mimeType);
    }, { format, quality, selector });

    if (typeof dataUrl !== 'string' || dataUrl === 'error:canvas-not-found') {
      throw new Error(`CanvasStrategy: Could not find canvas element matching selector '${selector}' or an error occurred during capture.`);
    }

    // Extract base64 data
    return Buffer.from(dataUrl.split(',')[1], 'base64');
  }

  async finish(page: Page): Promise<Buffer | void> {
    if (this.useWebCodecs) {
      const chunkData = await page.evaluate<string>(async function() {
        const context = (window as any).heliosWebCodecs;
        if (!context || !context.encoder) return '';

        await context.encoder.flush();

        const chunks = context.chunks;
        if (chunks.length === 0) return '';

        // Optimize transfer using Blob and FileReader
        const blob = new Blob(chunks, { type: 'application/octet-stream' });
        context.chunks = []; // Clear buffer immediately

        return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                // result format: "data:application/octet-stream;base64,ABC..."
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = () => reject(new Error('Failed to read blob'));
            reader.readAsDataURL(blob);
        });
      });

      if (chunkData && chunkData.length > 0) {
        return Buffer.from(chunkData, 'base64');
      }
    }
    return Promise.resolve();
  }

  getFFmpegArgs(options: RendererOptions, outputPath: string): FFmpegConfig {
    let videoInputArgs: string[];

    if (this.useWebCodecs) {
      if (this.useH264) {
        videoInputArgs = ['-f', 'h264', '-i', '-'];
      } else {
        videoInputArgs = ['-f', 'ivf', '-i', '-'];
      }
    } else {
      videoInputArgs = ['-f', 'image2pipe', '-framerate', `${options.fps}`, '-i', '-'];
    }

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
