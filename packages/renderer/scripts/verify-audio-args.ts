import { DomStrategy } from '../src/strategies/DomStrategy';
import { CanvasStrategy } from '../src/strategies/CanvasStrategy';
import { RendererOptions } from '../src/types';

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
};

const runTest = () => {
  console.log('Verifying Audio Arguments Generation (Ensuring -t is used instead of -shortest)...');

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
  // With complex filter implementation, we map [a0] instead of 1:a directly
  assert(argsDomWithAudio.includes('[a0]'), 'DomStrategy should map audio stream [a0]');
  assert(argsDomWithAudio.includes('-t'), 'DomStrategy should include -t');
  assert(argsDomWithAudio.includes('5'), 'DomStrategy should include duration 5');
  assert(!argsDomWithAudio.includes('-shortest'), 'DomStrategy should NOT include -shortest');

  // Case 2: DomStrategy without Audio
  const argsDomNoAudio = domStrategy.getFFmpegArgs(optionsWithoutAudio, outputPath);
  console.log('Testing DomStrategy without Audio...');
  assert(!argsDomNoAudio.includes('/path/to/audio.mp3'), 'DomStrategy should NOT include audio path');
  assert(!argsDomNoAudio.includes('-c:a'), 'DomStrategy should NOT include -c:a');
  assert(!argsDomNoAudio.includes('1:a'), 'DomStrategy should NOT map audio stream');


  // Test CanvasStrategy
  const canvasStrategy = new CanvasStrategy(optionsWithAudio);

  // Case 3: CanvasStrategy with Audio
  const argsCanvasWithAudio = canvasStrategy.getFFmpegArgs(optionsWithAudio, outputPath);
  console.log('Testing CanvasStrategy with Audio...');
  assert(argsCanvasWithAudio.includes('-i'), 'CanvasStrategy should include -i');
  assert(argsCanvasWithAudio.includes('/path/to/audio.mp3'), 'CanvasStrategy should include audio path');
  assert(argsCanvasWithAudio.includes('-c:a'), 'CanvasStrategy should include -c:a');
  assert(argsCanvasWithAudio.includes('-map'), 'CanvasStrategy should include -map');
  // With complex filter implementation, we map [a0] instead of 1:a directly
  assert(argsCanvasWithAudio.includes('[a0]'), 'CanvasStrategy should map audio stream [a0]');
  assert(argsCanvasWithAudio.includes('-t'), 'CanvasStrategy should include -t');
  assert(argsCanvasWithAudio.includes('5'), 'CanvasStrategy should include duration 5');
  assert(!argsCanvasWithAudio.includes('-shortest'), 'CanvasStrategy should NOT include -shortest');

  // Case 4: CanvasStrategy without Audio
  const argsCanvasNoAudio = canvasStrategy.getFFmpegArgs(optionsWithoutAudio, outputPath);
  console.log('Testing CanvasStrategy without Audio...');
  assert(!argsCanvasNoAudio.includes('/path/to/audio.mp3'), 'CanvasStrategy should NOT include audio path');
  assert(!argsCanvasNoAudio.includes('-c:a'), 'CanvasStrategy should NOT include -c:a');
  assert(!argsCanvasNoAudio.includes('1:a'), 'CanvasStrategy should NOT map audio stream');

  console.log('✅ Verification Passed!');
};

runTest();
