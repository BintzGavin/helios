import { DomStrategy } from '../src/strategies/DomStrategy';
import { CanvasStrategy } from '../src/strategies/CanvasStrategy';
import { RendererOptions } from '../src/types';
import { Page } from 'playwright';

async function main() {
  console.log('Starting Codec Validation Verification...');
  let errors = 0;

  // 1. Verify DomStrategy Validation
  try {
    console.log('[Test 1] Testing DomStrategy with videoCodec="copy"...');
    const options: RendererOptions = {
      width: 1920,
      height: 1080,
      fps: 30,
      durationInSeconds: 1,
      mode: 'dom',
      videoCodec: 'copy', // Invalid
    };

    new DomStrategy(options);
    console.error('❌ FAIL: DomStrategy should have thrown an error but did not.');
    errors++;
  } catch (e: any) {
    if (e.message.includes('DomStrategy produces image sequences and cannot be used with \'copy\' codec')) {
      console.log('✅ PASS: DomStrategy threw expected error.');
    } else {
      console.error(`❌ FAIL: DomStrategy threw unexpected error: ${e.message}`);
      errors++;
    }
  }

  // 2. Verify CanvasStrategy Validation (Mocking prepare)
  try {
    console.log('[Test 2] Testing CanvasStrategy (Fallback) with videoCodec="copy"...');
    const options: RendererOptions = {
        width: 1920,
        height: 1080,
        fps: 30,
        durationInSeconds: 1,
        mode: 'canvas',
        videoCodec: 'copy', // Invalid if WebCodecs fails
    };

    const strategy = new CanvasStrategy(options);

    // Mock page to simulate WebCodecs NOT supported
    const mockPage = {
        evaluate: async (fn: any, args: any) => {
            // Return structure that satisfies WebCodecs check (supported: false)
            return { supported: false, reason: 'Mocked unsupported' };
        },
        viewportSize: () => ({ width: 1920, height: 1080 }),
        frames: () => [],
    } as unknown as Page;

    await strategy.prepare(mockPage);

    console.error('❌ FAIL: CanvasStrategy should have thrown an error but did not.');
    errors++;
  } catch (e: any) {
    if (e.message.includes('CanvasStrategy failed to initialize WebCodecs and fell back to image capture')) {
        console.log('✅ PASS: CanvasStrategy threw expected error.');
    } else {
        console.error(`❌ FAIL: CanvasStrategy threw unexpected error: ${e.message}`);
        errors++;
    }
  }

  if (errors > 0) {
    console.error(`\nValidation failed with ${errors} errors.`);
    process.exit(1);
  } else {
    console.log('\nAll validation tests passed!');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
