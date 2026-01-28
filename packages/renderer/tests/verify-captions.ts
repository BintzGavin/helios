import { FFmpegBuilder } from '../src/utils/FFmpegBuilder.js';
import { RendererOptions } from '../src/types.js';
import assert from 'assert';
import path from 'path';

console.log('Verifying Caption Burning logic...');

const mockOptions: RendererOptions = {
  width: 1920,
  height: 1080,
  fps: 30,
  durationInSeconds: 10,
  mode: 'canvas'
};

const outputPath = 'output.mp4';
const videoInputArgs = ['-i', 'pipe:0'];

// Test 1: Subtitles Only
{
  console.log('Test 1: Subtitles Only');
  const options: RendererOptions = {
    ...mockOptions,
    subtitles: 'subs.srt'
  };

  const args = FFmpegBuilder.getArgs(options, outputPath, videoInputArgs);

  // Verify filter complex
  const filterIndex = args.indexOf('-filter_complex');
  assert.notStrictEqual(filterIndex, -1, 'Should have -filter_complex');
  const filter = args[filterIndex + 1];

  assert.ok(filter.includes("[0:v]subtitles='subs.srt'[vout]"), 'Should have subtitles filter');

  // Verify map
  const mapIndex = args.indexOf('-map');
  assert.strictEqual(args[mapIndex + 1], '[vout]', 'Should map [vout]');

  console.log('✅ Passed');
}

// Test 2: Subtitles + Audio
{
  console.log('Test 2: Subtitles + Audio');
  const options: RendererOptions = {
    ...mockOptions,
    subtitles: 'subs.srt',
    audioFilePath: 'audio.mp3'
  };

  const args = FFmpegBuilder.getArgs(options, outputPath, videoInputArgs);

  // Verify filter complex
  const filterIndex = args.indexOf('-filter_complex');
  const filter = args[filterIndex + 1];

  // Should have both video and audio filters separated by ;
  assert.ok(filter.includes("[0:v]subtitles='subs.srt'[vout]"), 'Should have subtitles filter');
  assert.ok(filter.includes('aformat=channel_layouts=stereo'), 'Should have audio filter');
  assert.ok(filter.includes(';'), 'Should combine filters with ;');

  // Verify maps
  // We expect -map [vout] and -map [a0] (since single track)
  const maps = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-map') maps.push(args[i+1]);
  }

  assert.ok(maps.includes('[vout]'), 'Should map [vout]');
  assert.ok(maps.includes('[a0]'), 'Should map [a0]');

  console.log('✅ Passed');
}

// Test 3: Subtitles + Copy Codec (Error)
{
  console.log('Test 3: Subtitles + Copy Codec');
  const options: RendererOptions = {
    ...mockOptions,
    subtitles: 'subs.srt',
    videoCodec: 'copy'
  };

  try {
    FFmpegBuilder.getArgs(options, outputPath, videoInputArgs);
    assert.fail('Should have thrown an error');
  } catch (e: any) {
    assert.ok(e.message.includes('Cannot burn subtitles'), 'Error message should mention subtitles constraint');
    console.log('✅ Passed');
  }
}

// Test 4: Path Escaping
{
  console.log('Test 4: Path Escaping');
  // Windows style path with special chars
  const complexPath = "C:\\Users\\Name's\\Project\\subs.srt";
  const options: RendererOptions = {
    ...mockOptions,
    subtitles: complexPath
  };

  const args = FFmpegBuilder.getArgs(options, outputPath, videoInputArgs);
  const filterIndex = args.indexOf('-filter_complex');
  const filter = args[filterIndex + 1];

  // Expected: C\:/Users/Name\'s/Project/subs.srt
  // 1. backslashes -> forward slashes
  // 2. : -> \:
  // 3. ' -> \'

  // Check that backslashes are gone/replaced
  assert.strictEqual(filter.includes('\\'), true, 'Should contain escapes');

  // Extract path from filter: [0:v]subtitles='PATH'[vout]
  const match = filter.match(/subtitles='(.*)'\[vout\]/);
  const escapedPath = match ? match[1] : '';

  console.log(`Original: ${complexPath}`);
  console.log(`Escaped:  ${escapedPath}`);

  assert.ok(escapedPath.includes('C\\:'), 'Drive colon should be escaped');
  assert.ok(escapedPath.includes("Name\\'s"), 'Single quote should be escaped');
  assert.ok(!escapedPath.includes('\\Users'), 'Backslashes should be replaced (except for escapes)');

  console.log('✅ Passed');
}

console.log('All verification tests passed!');
