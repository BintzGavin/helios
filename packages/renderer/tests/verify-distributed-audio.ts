import { FFmpegBuilder } from '../src/utils/FFmpegBuilder.js';
import { RendererOptions, AudioTrackConfig } from '../src/types.js';

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

async function runTests() {
  console.log('Running Distributed Audio verification...');

  const baseOptions: RendererOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 10,
    mode: 'dom',
  };

  // Test 1: mixInputAudio = true with no extra tracks
  {
    console.log('Test 1: mixInputAudio = true, no tracks');
    const options: RendererOptions = { ...baseOptions, mixInputAudio: true, audioTracks: [] };
    const { args } = FFmpegBuilder.getArgs(options, 'out.mp4', ['-i', 'input.mp4']);

    // Should explicitly map 0:a
    const mapIndex = args.findIndex((arg, i) => arg === '-map' && args[i+1] === '0:a');
    assert(mapIndex > -1, 'Should explicitly map 0:a');
  }

  // Test 2: mixInputAudio = true with 1 extra track
  {
    console.log('Test 2: mixInputAudio = true, 1 track');
    const track: AudioTrackConfig = { path: 'track1.mp3' };
    const options: RendererOptions = { ...baseOptions, mixInputAudio: true, audioTracks: [track] };
    const { args } = FFmpegBuilder.getArgs(options, 'out.mp4', ['-i', 'input.mp4']);

    const filterComplex = args.find((arg, i) => args[i - 1] === '-filter_complex');
    assert(!!filterComplex, 'Should have filter_complex');

    // Should have amix with 2 inputs: [0:a] and [a0]
    assertIncludes(filterComplex!, '[0:a][a0]amix=inputs=2', 'Should mix input video audio and track 1');
  }

  // Test 3: mixInputAudio = false (default) with 1 extra track
  {
    console.log('Test 3: mixInputAudio = false, 1 track');
    const track: AudioTrackConfig = { path: 'track1.mp3' };
    const options: RendererOptions = { ...baseOptions, mixInputAudio: false, audioTracks: [track] };
    const { args } = FFmpegBuilder.getArgs(options, 'out.mp4', ['-i', 'input.mp4']);

    // Check that we DO NOT map 0:a or include it in mix
    const map0a = args.findIndex((arg, i) => arg === '-map' && args[i+1] === '0:a');
    assert(map0a === -1, 'Should NOT map 0:a');

    const filterComplex = args.find((arg, i) => args[i - 1] === '-filter_complex');
    if (filterComplex) {
        assert(!filterComplex.includes('[0:a]'), 'Filter complex should not include [0:a]');
    }

    // Check map [a0]
    const mapIndex = args.findIndex((arg, i) => arg === '-map' && args[i+1] === '[a0]');
    assert(mapIndex > -1, 'Should map [a0]');
  }

  // Test 4: mixInputAudio = true with 2 extra tracks
  {
    console.log('Test 4: mixInputAudio = true, 2 tracks');
    const tracks: AudioTrackConfig[] = [{ path: 'track1.mp3' }, { path: 'track2.mp3' }];
    const options: RendererOptions = { ...baseOptions, mixInputAudio: true, audioTracks: tracks };
    const { args } = FFmpegBuilder.getArgs(options, 'out.mp4', ['-i', 'input.mp4']);

    const filterComplex = args.find((arg, i) => args[i - 1] === '-filter_complex');
    assert(!!filterComplex, 'Should have filter_complex');

    // Should have amix with 3 inputs: [0:a], [a0], [a1]
    assertIncludes(filterComplex!, '[0:a][a0][a1]amix=inputs=3', 'Should mix input video audio and 2 tracks');
  }

  console.log('✅ All tests passed!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
