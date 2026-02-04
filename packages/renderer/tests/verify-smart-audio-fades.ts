
import { FFmpegBuilder } from '../src/utils/FFmpegBuilder.js';
import { RendererOptions, AudioTrackConfig } from '../src/types.js';

// Standalone verification script for Smart Audio Fades logic.
// Run with: npx tsx packages/renderer/tests/verify-smart-audio-fades.ts

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertIncludes(haystack: string, needle: string, message: string) {
  if (!haystack.includes(needle)) {
    throw new Error(`Assertion failed: ${message}\nExpected to find: "${needle}"\nIn: "${haystack}"`);
  }
}

function assertNotIncludes(haystack: string, needle: string, message: string) {
  if (haystack.includes(needle)) {
    throw new Error(`Assertion failed: ${message}\nExpected NOT to find: "${needle}"\nIn: "${haystack}"`);
  }
}

async function runTests() {
  console.log('Running Smart Audio Fades verification...');

  const baseOptions: RendererOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 10,
    mode: 'dom',
  };

  // Test 1: Standard case - Track fits within composition
  {
    console.log('Test 1: Standard case');
    const track: AudioTrackConfig = {
      path: 'test.mp3',
      offset: 0,
      duration: 5.0,
      fadeOutDuration: 1.0,
    };
    const options: RendererOptions = { ...baseOptions, audioTracks: [track] };
    const { args } = FFmpegBuilder.getArgs(options, 'out.mp4', []);
    const filterComplex = args.find((arg, i) => args[i - 1] === '-filter_complex');

    // Expected: 5s duration. Fade out 1s. End time = 5s. Start time = 4s.
    assert(!!filterComplex, 'Should have filter_complex');
    assertIncludes(filterComplex!, 'afade=t=out:st=4:d=1', 'Should fade out at 4s');
  }

  // Test 2: Offset case - Track starts late
  {
    console.log('Test 2: Offset case (starts at 2s)');
    const track: AudioTrackConfig = {
      path: 'test.mp3',
      offset: 2.0,
      duration: 5.0,
      fadeOutDuration: 1.0,
    };
    const options: RendererOptions = { ...baseOptions, audioTracks: [track] };
    const { args } = FFmpegBuilder.getArgs(options, 'out.mp4', []);
    const filterComplex = args.find((arg, i) => args[i - 1] === '-filter_complex');

    // Expected: Starts at 2s. Duration 5s. Ends at 7s. Fade out starts at 6s.
    assertIncludes(filterComplex!, 'afade=t=out:st=6:d=1', 'Should fade out at 6s');
  }

  // Test 3: Negative Offset case - Track starts early (sliced)
  {
    console.log('Test 3: Negative Offset case (starts at -2s)');
    const track: AudioTrackConfig = {
      path: 'test.mp3',
      offset: -2.0,
      seek: 0, // Original seek
      duration: 10.0,
      fadeOutDuration: 1.0,
    };
    const options: RendererOptions = { ...baseOptions, audioTracks: [track] };
    const { args } = FFmpegBuilder.getArgs(options, 'out.mp4', []);
    const filterComplex = args.find((arg, i) => args[i - 1] === '-filter_complex');

    // Logic trace:
    // renderStartTime = 0. globalStart = -2.
    // inputSeek = 0 + (0 - (-2)) = 2s.
    // remainingSourceDuration = 10 - 2 = 8s.
    // delayMs = 0.
    // clipEndTime = 0 + 8 = 8s.
    // Fade out start = 8 - 1 = 7s.

    assertIncludes(filterComplex!, 'afade=t=out:st=7:d=1', 'Should fade out at 7s');
  }

  // Test 4: Looping case - Should fade at composition end
  {
    console.log('Test 4: Looping case');
    const track: AudioTrackConfig = {
      path: 'test.mp3',
      offset: 0,
      duration: 5.0,
      fadeOutDuration: 1.0,
      loop: true,
    };
    const options: RendererOptions = { ...baseOptions, durationInSeconds: 20, audioTracks: [track] };
    const { args } = FFmpegBuilder.getArgs(options, 'out.mp4', []);
    const filterComplex = args.find((arg, i) => args[i - 1] === '-filter_complex');

    // Expected: Composition duration 20s. Fade out starts at 19s.
    assertIncludes(filterComplex!, 'afade=t=out:st=19:d=1', 'Should fade out at 19s (composition end)');
  }

  // Test 5: Unknown Duration - Should fade at composition end
  {
    console.log('Test 5: Unknown Duration');
    const track: AudioTrackConfig = {
      path: 'test.mp3',
      offset: 0,
      // duration: undefined
      fadeOutDuration: 1.0,
    };
    const options: RendererOptions = { ...baseOptions, durationInSeconds: 20, audioTracks: [track] };
    const { args } = FFmpegBuilder.getArgs(options, 'out.mp4', []);
    const filterComplex = args.find((arg, i) => args[i - 1] === '-filter_complex');

    // Expected: Composition duration 20s. Fade out starts at 19s.
    assertIncludes(filterComplex!, 'afade=t=out:st=19:d=1', 'Should fade out at 19s (composition end)');
  }

  // Test 6: Playback Rate != 1.0
  {
    console.log('Test 6: Playback Rate 2.0');
    const track: AudioTrackConfig = {
      path: 'test.mp3',
      offset: 0,
      duration: 10.0,
      fadeOutDuration: 1.0,
      playbackRate: 2.0,
    };
    const options: RendererOptions = { ...baseOptions, audioTracks: [track] };
    const { args } = FFmpegBuilder.getArgs(options, 'out.mp4', []);
    const filterComplex = args.find((arg, i) => args[i - 1] === '-filter_complex');

    // Expected: Duration 10s. Rate 2.0 -> Effective duration 5s.
    // Ends at 5s. Fade out start = 4s.
    assertIncludes(filterComplex!, 'afade=t=out:st=4:d=1', 'Should fade out at 4s');
  }

  // Test 7: Negative Offset with Playback Rate
  {
    console.log('Test 7: Negative Offset + Playback Rate 2.0');
    const track: AudioTrackConfig = {
      path: 'test.mp3',
      offset: -2.0,
      duration: 12.0,
      fadeOutDuration: 1.0,
      playbackRate: 2.0,
    };
    const options: RendererOptions = { ...baseOptions, audioTracks: [track] };
    const { args } = FFmpegBuilder.getArgs(options, 'out.mp4', []);
    const filterComplex = args.find((arg, i) => args[i - 1] === '-filter_complex');

    // Logic trace:
    // globalStart = -2. renderStart = 0.
    // inputSeek = 0 + (0 - (-2)) * 2.0 = 4s. (We skipped 2s of timeline time, which is 4s of source time at 2x speed)
    // remainingSourceDuration = 12 - 4 = 8s.
    // durationInStream = 8 / 2.0 = 4s.
    // delayMs = 0.
    // clipEndTime = 4s.
    // Fade out start = 3s.

    assertIncludes(filterComplex!, 'afade=t=out:st=3:d=1', 'Should fade out at 3s');
  }

  console.log('✅ All tests passed!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
