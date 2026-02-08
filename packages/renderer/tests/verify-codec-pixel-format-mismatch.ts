import { FFmpegBuilder } from '../src/utils/FFmpegBuilder';
import { RendererOptions } from '../src/types';

async function main() {
  console.log('Starting Codec Pixel Format Mismatch Verification...');
  let errors = 0;

  // Case 1: libx264 + yuva420p (Should throw Error)
  try {
    console.log('[Test 1] Testing libx264 + yuva420p...');
    const options: RendererOptions = {
      width: 1920,
      height: 1080,
      fps: 30,
      durationInSeconds: 1,
      videoCodec: 'libx264',
      pixelFormat: 'yuva420p',
    };
    FFmpegBuilder.getArgs(options, 'output.mp4', []);
    console.error('❌ FAIL: Should have thrown an error for libx264 + yuva420p.');
    errors++;
  } catch (e: any) {
    if (e.message.includes('does not support alpha channel pixel format')) {
      console.log('✅ PASS: Threw expected error.');
    } else {
      console.error(`❌ FAIL: Threw unexpected error: ${e.message}`);
      errors++;
    }
  }

  // Case 2: libx265 + yuva420p (Should throw Error)
  try {
    console.log('[Test 2] Testing libx265 + yuva420p...');
    const options: RendererOptions = {
      width: 1920,
      height: 1080,
      fps: 30,
      durationInSeconds: 1,
      videoCodec: 'libx265',
      pixelFormat: 'yuva420p',
    };
    FFmpegBuilder.getArgs(options, 'output.mp4', []);
    console.error('❌ FAIL: Should have thrown an error for libx265 + yuva420p.');
    errors++;
  } catch (e: any) {
    if (e.message.includes('does not support alpha channel pixel format')) {
      console.log('✅ PASS: Threw expected error.');
    } else {
      console.error(`❌ FAIL: Threw unexpected error: ${e.message}`);
      errors++;
    }
  }

  // Case 3: libvpx-vp9 + yuva420p (Should Pass)
  try {
    console.log('[Test 3] Testing libvpx-vp9 + yuva420p...');
    const options: RendererOptions = {
      width: 1920,
      height: 1080,
      fps: 30,
      durationInSeconds: 1,
      videoCodec: 'libvpx-vp9',
      pixelFormat: 'yuva420p',
    };
    FFmpegBuilder.getArgs(options, 'output.webm', []);
    console.log('✅ PASS: No error thrown.');
  } catch (e: any) {
    console.error(`❌ FAIL: Unexpected error: ${e.message}`);
    errors++;
  }

  // Case 4: libx264 + yuv420p (Should Pass)
  try {
    console.log('[Test 4] Testing libx264 + yuv420p...');
    const options: RendererOptions = {
      width: 1920,
      height: 1080,
      fps: 30,
      durationInSeconds: 1,
      videoCodec: 'libx264',
      pixelFormat: 'yuv420p',
    };
    FFmpegBuilder.getArgs(options, 'output.mp4', []);
    console.log('✅ PASS: No error thrown.');
  } catch (e: any) {
    console.error(`❌ FAIL: Unexpected error: ${e.message}`);
    errors++;
  }

  // Case 5: libx264 + undefined pixelFormat (Should Pass, defaults to yuv420p)
  try {
    console.log('[Test 5] Testing libx264 + undefined pixelFormat...');
    const options: RendererOptions = {
      width: 1920,
      height: 1080,
      fps: 30,
      durationInSeconds: 1,
      videoCodec: 'libx264',
    };
    FFmpegBuilder.getArgs(options, 'output.mp4', []);
    console.log('✅ PASS: No error thrown.');
  } catch (e: any) {
    console.error(`❌ FAIL: Unexpected error: ${e.message}`);
    errors++;
  }

  // Case 6: h264 alias + argb (Should Fail)
  try {
    console.log('[Test 6] Testing h264 + argb...');
    const options: RendererOptions = {
      width: 1920,
      height: 1080,
      fps: 30,
      durationInSeconds: 1,
      videoCodec: 'h264',
      pixelFormat: 'argb',
    };
    FFmpegBuilder.getArgs(options, 'output.mp4', []);
    console.error('❌ FAIL: Should have thrown an error for h264 + argb.');
    errors++;
  } catch (e: any) {
    if (e.message.includes('does not support alpha channel pixel format')) {
      console.log('✅ PASS: Threw expected error.');
    } else {
      console.error(`❌ FAIL: Threw unexpected error: ${e.message}`);
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
