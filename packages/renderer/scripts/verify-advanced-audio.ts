import { DomStrategy } from '../src/strategies/DomStrategy';
import { RendererOptions } from '../src/types';

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
};

const runTest = () => {
  console.log('Verifying Advanced Audio Arguments Generation...');

  const outputPath = 'output.mp4';
  const domStrategy = new DomStrategy({ width: 1920, height: 1080, fps: 30, durationInSeconds: 1 });

  // Test Case 1: Volume Control
  // Track 1: Volume 0.5
  const optionsVolume: RendererOptions = {
    width: 1920, height: 1080, fps: 30, durationInSeconds: 5,
    audioTracks: [
      { path: 'audio.mp3', volume: 0.5 }
    ]
  };

  const argsVolumeResult = domStrategy.getFFmpegArgs(optionsVolume, outputPath);
  const argsVolume = argsVolumeResult.args;
  console.log('Testing Volume Control...');
  // Expect: [1:a]aformat=channel_layouts=stereo,volume=0.5[a0]
  const filterGraphIdx = argsVolume.indexOf('-filter_complex');
  assert(filterGraphIdx !== -1, 'Should include -filter_complex');
  const filterGraphVolume = argsVolume[filterGraphIdx + 1];
  assert(filterGraphVolume.includes('volume=0.5'), 'Should include volume filter');
  assert(filterGraphVolume.includes('aformat=channel_layouts=stereo'), 'Should include stereo format');

  // Test Case 2: Offset (Delay)
  // Track 1: Offset 2s (Delay 2000ms)
  const optionsDelay: RendererOptions = {
    width: 1920, height: 1080, fps: 30, durationInSeconds: 5,
    audioTracks: [
      { path: 'audio.mp3', offset: 2 }
    ]
  };

  const argsDelayResult = domStrategy.getFFmpegArgs(optionsDelay, outputPath);
  const argsDelay = argsDelayResult.args;
  console.log('Testing Audio Delay...');
  const filterGraphIdxDelay = argsDelay.indexOf('-filter_complex');
  assert(filterGraphIdxDelay !== -1, 'Should include -filter_complex');
  const filterGraphDelay = argsDelay[filterGraphIdxDelay + 1];
  assert(filterGraphDelay.includes('adelay=2000|2000'), 'Should include adelay filter');

  // Test Case 3: StartFrame + Offset Interaction
  // StartFrame = 30 (1s). Offset = 2s.
  // Delay should be (2 - 1) * 1000 = 1000ms.
  const optionsStartFrameDelay: RendererOptions = {
    width: 1920, height: 1080, fps: 30, durationInSeconds: 5,
    startFrame: 30,
    audioTracks: [
      { path: 'audio.mp3', offset: 2 }
    ]
  };

  const argsSFDelayResult = domStrategy.getFFmpegArgs(optionsStartFrameDelay, outputPath);
  const argsSFDelay = argsSFDelayResult.args;
  console.log('Testing StartFrame + Delay...');
  const filterGraphSFDelay = argsSFDelay[argsSFDelay.indexOf('-filter_complex') + 1];
  assert(filterGraphSFDelay.includes('adelay=1000|1000'), `Should calculate correct relative delay (expected 1000, got graph: ${filterGraphSFDelay})`);

  // Test Case 4: StartFrame > Offset (Seeking)
  // StartFrame = 60 (2s). Offset = 1s.
  // Delay = 0. Seek = 2 - 1 = 1s.
  const optionsSFSeek: RendererOptions = {
    width: 1920, height: 1080, fps: 30, durationInSeconds: 5,
    startFrame: 60,
    audioTracks: [
      { path: 'audio.mp3', offset: 1 }
    ]
  };

  const argsSFSeekResult = domStrategy.getFFmpegArgs(optionsSFSeek, outputPath);
  const argsSFSeek = argsSFSeekResult.args;
  console.log('Testing StartFrame + Seek...');
  // Check for -ss 1 before -i audio.mp3
  const inputIdx = argsSFSeek.indexOf('audio.mp3');
  const ssIdx = argsSFSeek.lastIndexOf('-ss', inputIdx);
  assert(ssIdx !== -1, 'Should include -ss before input');
  assert(argsSFSeek[ssIdx + 1] === '1', 'Should include seek time 1');

  // Test Case 5: Multiple Tracks (Mixing)
  const optionsMix: RendererOptions = {
    width: 1920, height: 1080, fps: 30, durationInSeconds: 5,
    audioTracks: [
      { path: 'music.mp3', volume: 0.5 },
      { path: 'sfx.mp3', offset: 3 }
    ]
  };

  const argsMixResult = domStrategy.getFFmpegArgs(optionsMix, outputPath);
  const argsMix = argsMixResult.args;
  console.log('Testing Mixing...');
  const filterGraphMix = argsMix[argsMix.indexOf('-filter_complex') + 1];
  assert(filterGraphMix.includes('volume=0.5'), 'Should include volume');
  assert(filterGraphMix.includes('adelay=3000|3000'), 'Should include delay');
  assert(filterGraphMix.includes('amix=inputs=2'), 'Should include amix');

  console.log('✅ Advanced Audio Verification Passed!');
};

runTest();
