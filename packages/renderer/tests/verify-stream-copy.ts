import { FFmpegBuilder } from '../src/utils/FFmpegBuilder';
import { RendererOptions } from '../src/types';
import * as assert from 'assert';

console.log('Verifying FFmpegBuilder Stream Copy Support...');

const baseOptions: RendererOptions = {
  width: 1920,
  height: 1080,
  fps: 30,
  durationInSeconds: 5,
};

const outputPath = 'output.mp4';
const videoInputArgs = ['-i', 'pipe:0'];

// Test Case 1: Standard Encoding (Default)
{
  console.log('Test 1: Standard Encoding (Default)');
  const args = FFmpegBuilder.getArgs(baseOptions, outputPath, videoInputArgs).args;

  assert.ok(args.includes('-c:v'), 'Should include video codec flag');
  assert.ok(args.includes('libx264'), 'Should default to libx264');
  assert.ok(args.includes('-pix_fmt'), 'Should include pixel format flag');
  assert.ok(args.includes('yuv420p'), 'Should include default pixel format');
  console.log('✅ Standard encoding checks passed');
}

// Test Case 2: Stream Copy
{
  console.log('Test 2: Stream Copy (videoCodec: "copy")');
  const copyOptions: RendererOptions = {
    ...baseOptions,
    videoCodec: 'copy'
  };
  const args = FFmpegBuilder.getArgs(copyOptions, outputPath, videoInputArgs).args;

  // Assertions for presence
  const codecIndex = args.indexOf('-c:v');
  assert.notStrictEqual(codecIndex, -1, 'Should include video codec flag');
  assert.strictEqual(args[codecIndex + 1], 'copy', 'Codec should be "copy"');
  assert.ok(args.includes('-movflags'), 'Should include movflags');
  assert.ok(args.includes('+faststart'), 'Should include +faststart');

  // Assertions for absence
  assert.strictEqual(args.includes('-pix_fmt'), false, 'Should NOT include -pix_fmt in copy mode');
  assert.strictEqual(args.includes('-crf'), false, 'Should NOT include -crf in copy mode');
  assert.strictEqual(args.includes('-preset'), false, 'Should NOT include -preset in copy mode');
  assert.strictEqual(args.includes('-b:v'), false, 'Should NOT include -b:v in copy mode');

  console.log('✅ Stream copy checks passed');
}

// Test Case 3: Stream Copy with explicit ignored flags (ensure they are ignored)
{
  console.log('Test 3: Stream Copy with explicit ignored flags');
  const copyOptions: RendererOptions = {
    ...baseOptions,
    videoCodec: 'copy',
    crf: 20,
    preset: 'slow',
    videoBitrate: '5M',
    pixelFormat: 'yuv444p'
  };
  const args = FFmpegBuilder.getArgs(copyOptions, outputPath, videoInputArgs).args;

  assert.strictEqual(args.includes('-pix_fmt'), false, 'Should NOT include -pix_fmt even if specified');
  assert.strictEqual(args.includes('-crf'), false, 'Should NOT include -crf even if specified');
  assert.strictEqual(args.includes('-preset'), false, 'Should NOT include -preset even if specified');
  assert.strictEqual(args.includes('-b:v'), false, 'Should NOT include -b:v even if specified');

  console.log('✅ Stream copy ignored flags checks passed');
}

console.log('🎉 All verification tests passed!');
