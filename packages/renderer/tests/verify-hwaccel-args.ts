import { FFmpegBuilder } from '../src/utils/FFmpegBuilder.js';
import { RendererOptions } from '../src/types.js';
import * as assert from 'assert';

console.log('Verifying FFmpeg Hardware Acceleration Arguments...');

const options: RendererOptions = {
  width: 1920,
  height: 1080,
  fps: 30,
  durationInSeconds: 10,
  hwAccel: 'cuda',
  ffmpegPath: '/usr/bin/ffmpeg', // Dummy path
};

const outputPath = 'output.mp4';
const videoInputArgs = ['-i', 'pipe:0'];

const { args } = FFmpegBuilder.getArgs(options, outputPath, videoInputArgs);

console.log('Generated Args:', args);

// Assert -hwaccel cuda is present
const hwAccelIndex = args.indexOf('-hwaccel');
assert.notStrictEqual(hwAccelIndex, -1, '-hwaccel flag should be present');
assert.strictEqual(args[hwAccelIndex + 1], 'cuda', '-hwaccel value should be "cuda"');

// Assert -hwaccel is before -i (video input)
const inputIndex = args.indexOf('-i');
// Note: videoInputArgs contains ['-i', 'pipe:0'], so -i is in the final args.
// However, FFmpegBuilder puts -y then hwaccel then videoInputArgs.
// So -hwaccel should be at index 1 (after -y) and -i at index 3 or later.
assert.ok(inputIndex > hwAccelIndex, '-hwaccel should be before -i');

console.log('✅ FFmpeg Hardware Acceleration Args Verified!');
