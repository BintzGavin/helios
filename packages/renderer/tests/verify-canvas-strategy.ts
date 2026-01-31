import { chromium } from 'playwright';
import { CanvasStrategy } from '../src/strategies/CanvasStrategy';
import { RendererOptions } from '../src/types';

async function testCodec(codecOption: string | undefined, expectedFourCC: string, codecName: string) {
  console.log(`Testing intermediateVideoCodec: ${codecOption || 'default (vp8)'}...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Mock VideoEncoder to ensure tests run even if the environment doesn't strictly support the codec.
  // We are testing the logic of Header Generation and Config Passing, not the browser's implementation.
  await page.evaluate(() => {
    (window as any).VideoEncoder = class {
      static isConfigSupported(config: any) {
        // console.log('Checking config:', config);
        return Promise.resolve({ supported: true });
      }
      configure() {}
      encode() {}
      close() {}
    };
  });

  const options: RendererOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 1,
    mode: 'canvas',
    intermediateVideoCodec: codecOption
  };

  const strategy = new CanvasStrategy(options);
  await strategy.prepare(page);

  if (expectedFourCC === 'NONE') {
    const chunkCount = await page.evaluate(() => {
        return (window as any).heliosWebCodecs.chunks.length;
    });
    await browser.close();
    if (chunkCount === 0) {
        console.log(`✅ ${codecName} passed: No IVF header written`);
    } else {
        console.error(`❌ ${codecName} failed: Expected 0 chunks (no header), got ${chunkCount}`);
        process.exit(1);
    }
    return;
  }

  const fourCC = await page.evaluate(() => {
    const chunks = (window as any).heliosWebCodecs.chunks;
    if (!chunks || chunks.length === 0) return 'NO_CHUNKS';
    const header = chunks[0]; // ArrayBuffer
    const view = new DataView(header);
    // Bytes 8-11
    let s = '';
    for (let i = 8; i < 12; i++) {
      s += String.fromCharCode(view.getUint8(i));
    }
    return s;
  });

  await browser.close();

  if (fourCC === expectedFourCC) {
    console.log(`✅ ${codecName} passed: Got ${fourCC}`);
  } else {
    console.error(`❌ ${codecName} failed: Expected ${expectedFourCC}, got ${fourCC}`);
    process.exit(1);
  }
}

async function run() {
  try {
    // Default is now H.264 (avc1), which does not use IVF header (NONE)
    await testCodec(undefined, 'NONE', 'Default (H.264)');
    await testCodec('vp8', 'VP80', 'Explicit VP8');
    await testCodec('vp9', 'VP90', 'VP9');
    await testCodec('av1', 'AV01', 'AV1');
    await testCodec('av01.0.05M.08', 'AV01', 'Specific AV1');
    await testCodec('avc1', 'NONE', 'H.264 (avc1)');
    await testCodec('h264', 'NONE', 'H.264 (string)');
    console.log('\nAll tests passed!');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
