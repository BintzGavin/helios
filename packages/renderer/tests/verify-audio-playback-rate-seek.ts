
import { FFmpegBuilder } from '../src/utils/FFmpegBuilder';
import { RendererOptions } from '../src/types';
import * as assert from 'assert';

console.log('Verifying Audio Playback Rate Seek Calculation...');

const baseOptions: RendererOptions = {
  width: 1920,
  height: 1080,
  fps: 30,
  durationInSeconds: 10,
  startFrame: 0,
  videoCodec: 'libx264',
  audioTracks: []
};

function testPlaybackRateSeek(rate: number, renderStartTime: number, expectedSeek: number, description: string) {
  const options: RendererOptions = {
    ...baseOptions,
    startFrame: renderStartTime * 30, // Convert seconds to frames
    audioTracks: [
      {
        path: 'test.mp3',
        offset: 0,
        seek: 0,
        playbackRate: rate
      }
    ]
  };

  const { args } = FFmpegBuilder.getArgs(options, 'output.mp4', ['-i', 'video.mp4']);

  // Find -ss argument for the audio input
  // Audio input args are added after video input args
  // Logic: video inputs... audio inputs...
  // -ss seek -i path

  const ssIndex = args.indexOf('-ss');
  const seekValue = parseFloat(args[ssIndex + 1]);

  if (Math.abs(seekValue - expectedSeek) < 0.001) {
    console.log(`✅ Passed: ${description} (Rate: ${rate}, Start: ${renderStartTime}s) -> Seek: ${seekValue}`);
  } else {
    console.error(`❌ Failed: ${description} (Rate: ${rate}, Start: ${renderStartTime}s)`);
    console.error(`   Expected Seek: ${expectedSeek}, Got: ${seekValue}`);
    process.exit(1);
  }
}

// Case 1: Normal playback rate (1.0), render start at 5s
// Expected: Seek 5s
testPlaybackRateSeek(1.0, 5, 5.0, 'Normal Rate');

// Case 2: Fast playback rate (2.0), render start at 5s
// Timeline: 0s -> Media: 0s
// Timeline: 5s -> Media: 10s (because we played 5s of timeline at 2x speed)
// Expected: Seek 10s
testPlaybackRateSeek(2.0, 5, 10.0, 'Fast Rate (2x)');

// Case 3: Slow playback rate (0.5), render start at 5s
// Timeline: 0s -> Media: 0s
// Timeline: 5s -> Media: 2.5s (because we played 5s of timeline at 0.5x speed)
// Expected: Seek 2.5s
testPlaybackRateSeek(0.5, 5, 2.5, 'Slow Rate (0.5x)');

console.log('All tests passed!');
