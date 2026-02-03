import { FFmpegBuilder } from '../src/utils/FFmpegBuilder';
import { RendererOptions } from '../src/types';

async function main() {
  console.log('Starting Audio Fades Verification...');
  let errors = 0;

  const baseOptions: RendererOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 10,
    videoCodec: 'libx264',
  };
  const videoInputArgs = ['-f', 'rawvideo', '-i', 'pipe:0'];

  // Test 1: Fade In
  try {
    console.log('[Test 1] Testing Fade In...');
    const options: RendererOptions = {
      ...baseOptions,
      audioTracks: [{
        path: 'audio.mp3',
        fadeInDuration: 2
      }]
    };
    const { args } = FFmpegBuilder.getArgs(options, 'out.mp4', videoInputArgs);
    const filterComplex = args[args.indexOf('-filter_complex') + 1];

    // Expect: afade=t=in:st=0:d=2
    // Note: st=0 because delay is 0
    if (filterComplex.includes('afade=t=in:st=0:d=2')) {
       console.log('✅ PASS: Fade In filter found.');
    } else {
       console.error(`❌ FAIL: Expected afade=t=in:st=0:d=2, got: ${filterComplex}`);
       errors++;
    }
  } catch (e) {
    console.error(`❌ FAIL: Exception: ${e}`);
    errors++;
  }

  // Test 2: Fade Out
  try {
    console.log('[Test 2] Testing Fade Out...');
    const options: RendererOptions = {
      ...baseOptions,
      durationInSeconds: 10,
      audioTracks: [{
        path: 'audio.mp3',
        fadeOutDuration: 3
      }]
    };
    const { args } = FFmpegBuilder.getArgs(options, 'out.mp4', videoInputArgs);
    const filterComplex = args[args.indexOf('-filter_complex') + 1];

    // Expect: afade=t=out:st=7:d=3  (10 - 3 = 7)
    if (filterComplex.includes('afade=t=out:st=7:d=3')) {
       console.log('✅ PASS: Fade Out filter found.');
    } else {
       console.error(`❌ FAIL: Expected afade=t=out:st=7:d=3, got: ${filterComplex}`);
       errors++;
    }
  } catch (e) {
    console.error(`❌ FAIL: Exception: ${e}`);
    errors++;
  }

  // Test 3: Fade In with Offset
  try {
    console.log('[Test 3] Testing Fade In with Offset...');
    const options: RendererOptions = {
      ...baseOptions,
      audioTracks: [{
        path: 'audio.mp3',
        offset: 5,
        fadeInDuration: 2
      }]
    };
    const { args } = FFmpegBuilder.getArgs(options, 'out.mp4', videoInputArgs);
    const filterComplex = args[args.indexOf('-filter_complex') + 1];

    // Offset 5s. Delay = 5000ms. startTime = 5.
    // Expect: afade=t=in:st=5:d=2
    if (filterComplex.includes('afade=t=in:st=5:d=2')) {
       console.log('✅ PASS: Fade In with Offset filter found.');
    } else {
       console.error(`❌ FAIL: Expected afade=t=in:st=5:d=2, got: ${filterComplex}`);
       errors++;
    }
  } catch (e) {
    console.error(`❌ FAIL: Exception: ${e}`);
    errors++;
  }

  // Test 4: Fade Out with Frame Count
  try {
    console.log('[Test 4] Testing Fade Out with Frame Count...');
    const options: RendererOptions = {
      ...baseOptions,
      durationInSeconds: 100, // Should be ignored
      frameCount: 150, // 5 seconds at 30fps
      fps: 30,
      audioTracks: [{
        path: 'audio.mp3',
        fadeOutDuration: 1
      }]
    };
    const { args } = FFmpegBuilder.getArgs(options, 'out.mp4', videoInputArgs);
    const filterComplex = args[args.indexOf('-filter_complex') + 1];

    // Composition Duration = 150/30 = 5s.
    // Start Time = 5 - 1 = 4s.
    // Expect: afade=t=out:st=4:d=1
    if (filterComplex.includes('afade=t=out:st=4:d=1')) {
       console.log('✅ PASS: Fade Out with Frame Count filter found.');
    } else {
       console.error(`❌ FAIL: Expected afade=t=out:st=4:d=1, got: ${filterComplex}`);
       errors++;
    }
  } catch (e) {
    console.error(`❌ FAIL: Exception: ${e}`);
    errors++;
  }

  // Test 5: Multiple Tracks, Both Fades
  try {
    console.log('[Test 5] Testing Multiple Tracks with Fades...');
    const options: RendererOptions = {
      ...baseOptions,
      durationInSeconds: 10,
      audioTracks: [
        { path: 't1.mp3', fadeInDuration: 1 },
        { path: 't2.mp3', fadeOutDuration: 1 }
      ]
    };
    const { args } = FFmpegBuilder.getArgs(options, 'out.mp4', videoInputArgs);
    const filterComplex = args[args.indexOf('-filter_complex') + 1];

    // t1: afade=t=in:st=0:d=1
    // t2: afade=t=out:st=9:d=1
    const hasT1 = filterComplex.includes('afade=t=in:st=0:d=1');
    const hasT2 = filterComplex.includes('afade=t=out:st=9:d=1');

    if (hasT1 && hasT2) {
       console.log('✅ PASS: Both filters found.');
    } else {
       console.error(`❌ FAIL: Missing filters. Got: ${filterComplex}`);
       errors++;
    }
  } catch (e) {
    console.error(`❌ FAIL: Exception: ${e}`);
    errors++;
  }

  if (errors > 0) {
    console.error(`\nVerification failed with ${errors} errors.`);
    process.exit(1);
  } else {
    console.log('\n✅ All verification tests passed!');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
