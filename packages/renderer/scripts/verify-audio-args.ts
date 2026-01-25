import { DomStrategy } from '../src/strategies/DomStrategy';
import { CanvasStrategy } from '../src/strategies/CanvasStrategy';
import { RendererOptions } from '../src/types';

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
};

const runTest = () => {
  console.log('Verifying Audio Arguments Generation...');

  const optionsWithAudio: RendererOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 5,
    audioFilePath: '/path/to/audio.mp3',
  };

  const optionsWithoutAudio: RendererOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 5,
  };

  const outputPath = 'output.mp4';

  // Test DomStrategy
  const domStrategy = new DomStrategy();

  // Case 1: DomStrategy with Audio
  const argsDomWithAudio = domStrategy.getFFmpegArgs(optionsWithAudio, outputPath);
  console.log('Testing DomStrategy with Audio...');
  assert(argsDomWithAudio.includes('-i'), 'DomStrategy should include -i');
  assert(argsDomWithAudio.includes('/path/to/audio.mp3'), 'DomStrategy should include audio path');
  assert(argsDomWithAudio.includes('-c:a'), 'DomStrategy should include -c:a');
  assert(argsDomWithAudio.includes('-map'), 'DomStrategy should include -map');
  assert(argsDomWithAudio.includes('1:a'), 'DomStrategy should map audio stream 1:a');

  // Case 2: DomStrategy without Audio
  const argsDomNoAudio = domStrategy.getFFmpegArgs(optionsWithoutAudio, outputPath);
  console.log('Testing DomStrategy without Audio...');
  assert(!argsDomNoAudio.includes('/path/to/audio.mp3'), 'DomStrategy should NOT include audio path');
  assert(!argsDomNoAudio.includes('-c:a'), 'DomStrategy should NOT include -c:a');
  assert(!argsDomNoAudio.includes('1:a'), 'DomStrategy should NOT map audio stream');


  // Test CanvasStrategy
  const canvasStrategy = new CanvasStrategy();

  // Case 3: CanvasStrategy with Audio
  const argsCanvasWithAudio = canvasStrategy.getFFmpegArgs(optionsWithAudio, outputPath);
  console.log('Testing CanvasStrategy with Audio...');
  assert(argsCanvasWithAudio.includes('-i'), 'CanvasStrategy should include -i');
  assert(argsCanvasWithAudio.includes('/path/to/audio.mp3'), 'CanvasStrategy should include audio path');
  assert(argsCanvasWithAudio.includes('-c:a'), 'CanvasStrategy should include -c:a');
  assert(argsCanvasWithAudio.includes('-map'), 'CanvasStrategy should include -map');
  assert(argsCanvasWithAudio.includes('1:a'), 'CanvasStrategy should map audio stream 1:a');

  // Case 4: CanvasStrategy without Audio
  const argsCanvasNoAudio = canvasStrategy.getFFmpegArgs(optionsWithoutAudio, outputPath);
  console.log('Testing CanvasStrategy without Audio...');
  assert(!argsCanvasNoAudio.includes('/path/to/audio.mp3'), 'CanvasStrategy should NOT include audio path');
  assert(!argsCanvasNoAudio.includes('-c:a'), 'CanvasStrategy should NOT include -c:a');
  assert(!argsCanvasNoAudio.includes('1:a'), 'CanvasStrategy should NOT map audio stream');

  console.log('✅ Verification Passed!');
};

runTest();
