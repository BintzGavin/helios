import { FFmpegBuilder } from '../src/utils/FFmpegBuilder';
import { RendererOptions } from '../src/types';

function runTests() {
  console.log('Running Audio Playback Rate Verification...');
  let hasError = false;

  const baseOptions: RendererOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 1,
    mode: 'canvas',
  };

  const dummyInputArgs = ['-f', 'image2pipe', '-i', '-'];
  const outputPath = 'output.mp4';

  function getAudioFilter(args: string[]): string {
    const complexFilterIndex = args.indexOf('-filter_complex');
    if (complexFilterIndex === -1) return '';
    return args[complexFilterIndex + 1];
  }

  // Test 1: Rate = 1.0 (No atempo)
  console.log('\nTest 1: Rate 1.0 (Default)');
  const options1: RendererOptions = {
    ...baseOptions,
    audioTracks: [{ path: 'audio.mp3', playbackRate: 1.0 }]
  };
  const args1 = FFmpegBuilder.getArgs(options1, outputPath, dummyInputArgs);
  const filter1 = getAudioFilter(args1.args);
  if (filter1.includes('atempo')) {
     console.error('❌ Failed: Expected no atempo filter for rate 1.0');
     console.error('Filter:', filter1);
     hasError = true;
  } else {
     console.log('✅ Passed');
  }

  // Test 2: Rate = 2.0 (Single atempo)
  console.log('\nTest 2: Rate 2.0');
  const options2: RendererOptions = {
    ...baseOptions,
    audioTracks: [{ path: 'audio.mp3', playbackRate: 2.0 }]
  };
  const args2 = FFmpegBuilder.getArgs(options2, outputPath, dummyInputArgs);
  const filter2 = getAudioFilter(args2.args);
  if (!filter2.includes('atempo=2')) {
     console.error('❌ Failed: Expected atempo=2.0');
     console.error('Filter:', filter2);
     hasError = true;
  } else {
     console.log('✅ Passed');
  }

  // Test 3: Rate = 0.5 (Single atempo)
  console.log('\nTest 3: Rate 0.5');
  const options3: RendererOptions = {
    ...baseOptions,
    audioTracks: [{ path: 'audio.mp3', playbackRate: 0.5 }]
  };
  const args3 = FFmpegBuilder.getArgs(options3, outputPath, dummyInputArgs);
  const filter3 = getAudioFilter(args3.args);
  if (!filter3.includes('atempo=0.5')) {
     console.error('❌ Failed: Expected atempo=0.5');
     console.error('Filter:', filter3);
     hasError = true;
  } else {
     console.log('✅ Passed');
  }

  // Test 4: Rate = 4.0 (Chained atempo)
  console.log('\nTest 4: Rate 4.0 (Chained)');
  const options4: RendererOptions = {
    ...baseOptions,
    audioTracks: [{ path: 'audio.mp3', playbackRate: 4.0 }]
  };
  const args4 = FFmpegBuilder.getArgs(options4, outputPath, dummyInputArgs);
  const filter4 = getAudioFilter(args4.args);
  // Expected: atempo=2.0,atempo=2.0 (or similar logic)
  // We check for occurrence count
  const atempoCount4 = (filter4.match(/atempo=2/g) || []).length;
  if (atempoCount4 < 2) {
     console.error('❌ Failed: Expected chained atempo for rate 4.0');
     console.error('Filter:', filter4);
     hasError = true;
  } else {
     console.log('✅ Passed');
  }

  // Test 5: Rate = 0.25 (Chained atempo)
  console.log('\nTest 5: Rate 0.25 (Chained)');
  const options5: RendererOptions = {
    ...baseOptions,
    audioTracks: [{ path: 'audio.mp3', playbackRate: 0.25 }]
  };
  const args5 = FFmpegBuilder.getArgs(options5, outputPath, dummyInputArgs);
  const filter5 = getAudioFilter(args5.args);
  const atempoCount5 = (filter5.match(/atempo=0.5/g) || []).length;
  if (atempoCount5 < 2) {
     console.error('❌ Failed: Expected chained atempo for rate 0.25');
     console.error('Filter:', filter5);
     hasError = true;
  } else {
     console.log('✅ Passed');
  }

  // Test 6: Rate = 3.0 (Chained + Remainder)
  console.log('\nTest 6: Rate 3.0 (Chained + Remainder)');
  const options6: RendererOptions = {
    ...baseOptions,
    audioTracks: [{ path: 'audio.mp3', playbackRate: 3.0 }]
  };
  const args6 = FFmpegBuilder.getArgs(options6, outputPath, dummyInputArgs);
  const filter6 = getAudioFilter(args6.args);
  // Expected: atempo=2.0,atempo=1.5
  if (!filter6.includes('atempo=2') || !filter6.includes('atempo=1.5')) {
     console.error('❌ Failed: Expected atempo=2.0 and atempo=1.5 for rate 3.0');
     console.error('Filter:', filter6);
     hasError = true;
  } else {
     console.log('✅ Passed');
  }

  // Test 7: Integration with Delay
  console.log('\nTest 7: Integration with Delay');
  const options7: RendererOptions = {
    ...baseOptions,
    audioTracks: [{ path: 'audio.mp3', playbackRate: 2.0, offset: 5 }]
  };
  const args7 = FFmpegBuilder.getArgs(options7, outputPath, dummyInputArgs);
  const filter7 = getAudioFilter(args7.args);

  // Verify order: atempo must come before adelay
  const atempoIndex = filter7.indexOf('atempo=2');
  const adelayIndex = filter7.indexOf('adelay=');

  if (atempoIndex === -1 || adelayIndex === -1) {
    console.error('❌ Failed: Missing filter components');
    hasError = true;
  } else if (atempoIndex > adelayIndex) {
    console.error('❌ Failed: atempo must be applied before adelay');
    console.error('Filter:', filter7);
    hasError = true;
  } else {
    console.log('✅ Passed');
  }

  // Test 8: Invalid Rate (Infinity)
  console.log('\nTest 8: Invalid Rate (Infinity)');
  const options8: RendererOptions = {
    ...baseOptions,
    audioTracks: [{ path: 'audio.mp3', playbackRate: Infinity }]
  };
  const args8 = FFmpegBuilder.getArgs(options8, outputPath, dummyInputArgs);
  const filter8 = getAudioFilter(args8.args);

  // Expected: No atempo filter (reset to 1.0)
  if (filter8.includes('atempo')) {
     console.error('❌ Failed: Expected no atempo filter for Infinity rate');
     console.error('Filter:', filter8);
     hasError = true;
  } else {
     console.log('✅ Passed');
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
