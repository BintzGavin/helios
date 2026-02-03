import { FFmpegBuilder } from '../src/utils/FFmpegBuilder';
import { RendererOptions } from '../src/types';

function runTests() {
  console.log('Running Audio Playback Seek Verification...');
  let hasError = false;

  const baseOptions: RendererOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 10,
    mode: 'canvas',
  };

  const dummyInputArgs = ['-f', 'image2pipe', '-i', '-'];
  const outputPath = 'output.mp4';

  function getSeekTime(args: string[], inputPath: string): number | null {
    // Find the input path
    const inputIndex = args.indexOf(inputPath);
    if (inputIndex === -1) return null;

    // Look for -ss before the input
    // The args structure is like: ... -ss SEEK -i INPUT ...
    // So if INPUT is at index I, -i is at I-1, SEEK is at I-2, -ss is at I-3
    if (args[inputIndex - 1] === '-i' && args[inputIndex - 3] === '-ss') {
      return parseFloat(args[inputIndex - 2]);
    }
    return null;
  }

  // Scenario:
  // Render Start: 5s (startFrame = 150, fps = 30)
  // Audio Offset: 0s (starts at beginning of timeline)
  // Audio Seek: 0s (start of audio file)
  // We are skipping 5s of timeline time.

  const startFrame = 150; // 5 seconds at 30fps

  // Test 1: Rate 1.0
  // Expected seek: 0 + (5 - 0) * 1.0 = 5.0
  console.log('\nTest 1: Rate 1.0 (Normal)');
  const options1: RendererOptions = {
    ...baseOptions,
    startFrame: startFrame,
    audioTracks: [{ path: 'audio.mp3', playbackRate: 1.0 }]
  };
  const args1 = FFmpegBuilder.getArgs(options1, outputPath, dummyInputArgs);
  const seek1 = getSeekTime(args1.args, 'audio.mp3');

  if (seek1 === 5.0) {
    console.log('✅ Passed: Seek is 5.0s');
  } else {
    console.error(`❌ Failed: Expected 5.0s, got ${seek1}s`);
    hasError = true;
  }

  // Test 2: Rate 2.0
  // Timeline elapsed: 5s
  // Media elapsed: 5s * 2.0 = 10s
  // Expected seek: 0 + 10 = 10.0
  console.log('\nTest 2: Rate 2.0 (Double Speed)');
  const options2: RendererOptions = {
    ...baseOptions,
    startFrame: startFrame,
    audioTracks: [{ path: 'audio.mp3', playbackRate: 2.0 }]
  };
  const args2 = FFmpegBuilder.getArgs(options2, outputPath, dummyInputArgs);
  const seek2 = getSeekTime(args2.args, 'audio.mp3');

  if (seek2 === 10.0) {
    console.log('✅ Passed: Seek is 10.0s');
  } else {
    console.error(`❌ Failed: Expected 10.0s, got ${seek2}s`);
    hasError = true;
  }

  // Test 3: Rate 0.5
  // Timeline elapsed: 5s
  // Media elapsed: 5s * 0.5 = 2.5s
  // Expected seek: 0 + 2.5 = 2.5
  console.log('\nTest 3: Rate 0.5 (Half Speed)');
  const options3: RendererOptions = {
    ...baseOptions,
    startFrame: startFrame,
    audioTracks: [{ path: 'audio.mp3', playbackRate: 0.5 }]
  };
  const args3 = FFmpegBuilder.getArgs(options3, outputPath, dummyInputArgs);
  const seek3 = getSeekTime(args3.args, 'audio.mp3');

  if (seek3 === 2.5) {
    console.log('✅ Passed: Seek is 2.5s');
  } else {
    console.error(`❌ Failed: Expected 2.5s, got ${seek3}s`);
    hasError = true;
  }

  // Test 4: Rate 1.5 with Initial Seek
  // Audio Seek: 2s (start playing from 2s into the file)
  // Timeline elapsed: 5s
  // Media elapsed: 5s * 1.5 = 7.5s
  // Expected seek: 2 + 7.5 = 9.5s
  console.log('\nTest 4: Rate 1.5 with Initial Seek');
  const options4: RendererOptions = {
    ...baseOptions,
    startFrame: startFrame,
    audioTracks: [{ path: 'audio.mp3', playbackRate: 1.5, seek: 2.0 }]
  };
  const args4 = FFmpegBuilder.getArgs(options4, outputPath, dummyInputArgs);
  const seek4 = getSeekTime(args4.args, 'audio.mp3');

  if (seek4 === 9.5) {
    console.log('✅ Passed: Seek is 9.5s');
  } else {
    console.error(`❌ Failed: Expected 9.5s, got ${seek4}s`);
    hasError = true;
  }

  if (hasError) {
    console.error('\n❌ Verification Failed.');
    process.exit(1);
  } else {
    console.log('\n✅ All verification tests passed!');
    process.exit(0);
  }
}

runTests();
