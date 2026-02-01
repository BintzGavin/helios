import { chromium } from 'playwright';
import { CanvasStrategy } from '../src/strategies/CanvasStrategy';
import { RendererOptions } from '../src/types';

async function testBitrate(
    width: number,
    height: number,
    fps: number,
    expectedMinBitrate: number,
    testName: string
) {
  console.log(`Testing bitrate for ${testName} (${width}x${height} @ ${fps}fps)...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set viewport to match desired resolution so page.viewportSize() is correct
  await page.setViewportSize({ width, height });

  // Inject canvas
  await page.setContent(`<canvas id="canvas" width="${width}" height="${height}"></canvas>`);

  // Mock VideoEncoder
  await page.evaluate(() => {
    (window as any).heliosWebCodecs = {
        lastConfig: null
    };

    (window as any).VideoEncoder = class {
      static isConfigSupported(config: any) {
        return Promise.resolve({ supported: true });
      }
      constructor(init: any) {}
      configure(config: any) {
         (window as any).heliosWebCodecs.lastConfig = config;
      }
      encode() {}
      close() {}
    };
  });

  const options: RendererOptions = {
    width,
    height,
    fps,
    durationInSeconds: 1,
    mode: 'canvas',
    intermediateVideoCodec: 'vp8'
  };

  const strategy = new CanvasStrategy(options);
  await strategy.prepare(page);

  const bitrate = await page.evaluate(() => {
    return (window as any).heliosWebCodecs.lastConfig?.bitrate;
  });

  await browser.close();

  if (typeof bitrate !== 'number') {
      console.error(`❌ ${testName} failed: Bitrate is undefined or not a number`);
      process.exit(1);
  }

  if (bitrate >= expectedMinBitrate) {
    console.log(`✅ ${testName} passed: Bitrate ${bitrate} >= ${expectedMinBitrate}`);
  } else {
    console.error(`❌ ${testName} failed: Bitrate ${bitrate} < ${expectedMinBitrate}`);
    process.exit(1);
  }
}

async function run() {
  try {
    // Test 1: Standard HD (1920x1080 @ 30fps)
    // 1920 * 1080 * 30 * 0.2 = 12,441,600
    // Should be clamped to 25,000,000
    await testBitrate(1920, 1080, 30, 25_000_000, 'Standard HD');

    // Test 2: 4K (3840x2160 @ 60fps)
    // 3840 * 2160 * 60 * 0.2 = 99,532,800
    // Should use calculated value ~99Mbps
    await testBitrate(3840, 2160, 60, 99_000_000, '4K 60fps');

    console.log('\nAll bitrate tests passed!');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
