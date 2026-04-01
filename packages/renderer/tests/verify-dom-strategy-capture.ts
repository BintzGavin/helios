import { DomStrategy } from '../src/strategies/DomStrategy.js';
import { RendererOptions } from '../src/types.js';

async function main() {
  const options: RendererOptions = {
    fps: 30,
    videoCodec: 'libx264',
    pixelFormat: 'yuv420p'
  };

  const strategy = new DomStrategy(options);

  // Create a mock page and cdpSession
  const mockPage: any = {
    context: () => ({
      newCDPSession: async () => mockCdpSession
    }),
    frames: () => [],
    evaluate: async () => ({}),
    screenshot: async () => Buffer.from('mock-fallback-buffer')
  };

  const mockCdpSession = {
    send: async (method: string, params: any) => {
      if (method === 'HeadlessExperimental.enable') return {};
      if (method === 'HeadlessExperimental.beginFrame') {
        return { screenshotData: Buffer.from('mock-buffer').toString('base64') };
      }
      return {};
    },
    detach: async () => {}
  };

  await strategy.prepare(mockPage);

  const bufferPromise = strategy.capture(mockPage, 100);
  console.log("Is Promise?", bufferPromise instanceof Promise);

  const buffer = await bufferPromise;
  console.log("Buffer returned:", buffer.toString() === 'mock-buffer');
}

main().catch(console.error);
