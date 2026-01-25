import { Page } from 'playwright';
import { RenderStrategy } from './RenderStrategy';
import { RendererOptions } from '../types';

export class CanvasStrategy implements RenderStrategy {
  private useWebCodecs = false;

  async prepare(page: Page): Promise<void> {
    // Detect WebCodecs support and initialize if possible
    const width = page.viewportSize()?.width || 1920;
    const height = page.viewportSize()?.height || 1080;

    const result = await page.evaluate(async (config) => {
      if (typeof VideoEncoder === 'undefined') {
        return { supported: false, reason: 'VideoEncoder not found' };
      }

      const encoderConfig = {
        codec: 'vp8',
        width: config.width,
        height: config.height,
        bitrate: 5_000_000, // 5 Mbps
      };

      try {
        const support = await VideoEncoder.isConfigSupported(encoderConfig);
        if (!support.supported) {
          return { supported: false, reason: 'VP8 config not supported' };
        }

        // Initialize global state for accumulation
        (window as any).heliosWebCodecs = {
          chunks: [], // Array of ArrayBuffers
          error: null,
        };

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
        // 8-11: 'VP80'
        view.setUint8(8, 'V'.charCodeAt(0));
        view.setUint8(9, 'P'.charCodeAt(0));
        view.setUint8(10, '8'.charCodeAt(0));
        view.setUint8(11, '0'.charCodeAt(0));
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

        const encoder = new VideoEncoder({
          output: (chunk, meta) => {
            const context = (window as any).heliosWebCodecs;

            // Create IVF Frame Header (12 bytes)
            const frameHeader = new ArrayBuffer(12);
            const view = new DataView(frameHeader);

            // 0-3: Frame size in bytes
            view.setUint32(0, chunk.byteLength, true);

            // 4-11: Timestamp (64-bit)
            // chunk.timestamp is in microseconds.
            view.setBigUint64(4, BigInt(chunk.timestamp || 0), true);

            context.chunks.push(frameHeader);

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

        return { supported: true };

      } catch (e) {
        return { supported: false, reason: (e as Error).message };
      }
    }, { width, height });

    if (result.supported) {
      this.useWebCodecs = true;
      console.log('CanvasStrategy: Using WebCodecs (VP8) for rendering.');
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
    const dataUrl = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return 'error:canvas-not-found';
      return canvas.toDataURL('image/png');
    });

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
    const videoInputArgs = this.useWebCodecs
      ? ['-f', 'ivf', '-i', '-']
      : ['-f', 'image2pipe', '-framerate', `${options.fps}`, '-i', '-'];

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
