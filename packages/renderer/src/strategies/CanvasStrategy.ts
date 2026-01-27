import { Page } from 'playwright';
import { RenderStrategy } from './RenderStrategy';
import { RendererOptions } from '../types';
import { FFmpegBuilder } from '../utils/FFmpegBuilder';

export class CanvasStrategy implements RenderStrategy {
  private useWebCodecs = false;
  private useH264 = false;

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
    return await page.evaluate(() => {
      console.log('[Helios Diagnostics] Checking Canvas environment...');
      const report = {
        videoEncoder: typeof VideoEncoder !== 'undefined',
        offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
        userAgent: navigator.userAgent,
      };
      return report;
    });
  }

  async prepare(page: Page): Promise<void> {
    // Ensure fonts are loaded before capture starts
    await page.evaluate(() => document.fonts.ready);

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
        // Prioritize H.264 (AVC) -> VP8
        addCandidate('avc1.4d002a'); // H.264 High Profile
        addCandidate('vp8');
    } else {
        // Default behavior
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

    const result = await page.evaluate(async (config) => {
      if (typeof VideoEncoder === 'undefined') {
        return { supported: false, reason: 'VideoEncoder not found' };
      }

      // Helper to try configuring a candidate
      const tryConfig = async (candidate: any) => {
          const encoderConfig: any = {
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
                return { supported: true, config: encoderConfig, candidate };
            }
          } catch (e) {
             // Ignore error and try next
          }
          return { supported: false };
      };

      let selected: any = null;
      for (const candidate of config.candidates) {
          const res = await tryConfig(candidate);
          if (res.supported) {
              selected = res;
              break;
          }
      }

      if (!selected) {
          return { supported: false, reason: 'No supported codec found among candidates' };
      }

      const { config: encoderConfig, candidate: selectedCandidate } = selected;

      // Initialize global state for accumulation
      (window as any).heliosWebCodecs = {
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

        (window as any).heliosWebCodecs.chunks.push(ivfHeader);
      }

      const encoder = new VideoEncoder({
        output: (chunk, meta) => {
          const context = (window as any).heliosWebCodecs;

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
          (window as any).heliosWebCodecs.error = e.message || 'Unknown VideoEncoder error';
        },
      });

      encoder.configure(encoderConfig);
      (window as any).heliosWebCodecs.encoder = encoder;

      return {
          supported: true,
          codec: encoderConfig.codec,
          isH264: selectedCandidate.isH264
      };

    }, {
        width,
        height,
        bitrate: intermediateBitrate,
        candidates,
        alphaMode
    });

    if (result.supported) {
      this.useWebCodecs = true;
      this.useH264 = result.isH264;
      console.log(`CanvasStrategy: Using WebCodecs (${result.codec}) with bitrate: ${intermediateBitrate}, alpha: ${alphaMode}`);
    } else {
      this.useWebCodecs = false;
      console.log(`CanvasStrategy: WebCodecs not available (${result.reason}). Falling back to toDataURL.`);
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
    const chunkData = await page.evaluate(async (time) => {
      const context = (window as any).heliosWebCodecs;

      if (context.error) {
        throw new Error(`WebCodecs Error: ${context.error}`);
      }

      const encoder = context.encoder as VideoEncoder;
      const canvas = document.querySelector('canvas');

      if (!canvas) throw new Error('Canvas not found');

      // Create Frame and Encode
      const frame = new VideoFrame(canvas, { timestamp: time * 1000 }); // microseconds
      encoder.encode(frame, { keyFrame: (time === 0) });
      frame.close();

      // 3. Collect Chunks
      // Note: VideoEncoder is async. encode() might not output immediately.
      // But we just collect whatever is in the queue.
      // If nothing is in the queue, we return empty.

      const chunks = context.chunks;
      if (chunks.length === 0) {
        return ''; // Return empty string
      }

      // Serialize chunks for transfer (they are ArrayBuffers)
      // We can return an array of number[] or base64.
      // ArrayBuffer[] is not directly transferrable via evaluate unless we use handle,
      // but returning { data: [...] } works if small.
      // Better: concat into one big buffer in browser then return.

      const totalLen = chunks.reduce((acc: number, c: ArrayBuffer) => acc + c.byteLength, 0);
      const combined = new Uint8Array(totalLen);
      let offset = 0;
      for (const c of chunks) {
        combined.set(new Uint8Array(c), offset);
        offset += c.byteLength;
      }

      // Clear chunks
      context.chunks = [];

      // Transfer as standard array (slow?) or Base64?
      // Playwright handles Uint8Array return by serializing.
      // Base64 is safer for binary integrity usually.

      // Let's use Base64 to be safe and robust.
      let binary = '';
      const len = combined.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(combined[i]);
      }
      return btoa(binary);

    }, frameTime);

    if (chunkData && chunkData.length > 0) {
        return Buffer.from(chunkData, 'base64');
    }
    return Buffer.alloc(0);
  }

  private async captureCanvas(page: Page, frameTime: number): Promise<Buffer> {
    const format = this.options.intermediateImageFormat || 'png';
    const quality = this.options.intermediateImageQuality;

    const dataUrl = await page.evaluate((args) => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return 'error:canvas-not-found';

      const mimeType = args.format === 'jpeg' ? 'image/jpeg' : 'image/png';

      if (args.format === 'jpeg' && typeof args.quality === 'number') {
        // canvas.toDataURL takes quality as 0.0 - 1.0
        return canvas.toDataURL(mimeType, args.quality / 100);
      }

      return canvas.toDataURL(mimeType);
    }, { format, quality });

    if (typeof dataUrl !== 'string' || dataUrl === 'error:canvas-not-found') {
      throw new Error('CanvasStrategy: Could not find canvas element or an error occurred during capture.');
    }

    // Extract base64 data
    return Buffer.from(dataUrl.split(',')[1], 'base64');
  }

  async finish(page: Page): Promise<Buffer | void> {
    if (this.useWebCodecs) {
      const chunkData = await page.evaluate(async () => {
        const context = (window as any).heliosWebCodecs;
        if (!context || !context.encoder) return '';

        await context.encoder.flush();

        const chunks = context.chunks;
        if (chunks.length === 0) return '';

        const totalLen = chunks.reduce((acc: number, c: ArrayBuffer) => acc + c.byteLength, 0);
        const combined = new Uint8Array(totalLen);
        let offset = 0;
        for (const c of chunks) {
          combined.set(new Uint8Array(c), offset);
          offset += c.byteLength;
        }
        context.chunks = [];

        let binary = '';
        const len = combined.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(combined[i]);
        }
        return btoa(binary);
      });

      if (chunkData && chunkData.length > 0) {
        return Buffer.from(chunkData, 'base64');
      }
    }
    return Promise.resolve();
  }

  getFFmpegArgs(options: RendererOptions, outputPath: string): string[] {
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

    return FFmpegBuilder.getArgs(options, outputPath, videoInputArgs);
  }
}
