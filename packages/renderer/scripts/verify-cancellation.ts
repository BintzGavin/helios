import { Renderer } from '../src/index';
import path from 'path';
import fs from 'fs';

async function main() {
  const outputDir = path.resolve(__dirname, '../output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, 'cancellation-test.mp4');

  // Use the built example from output/example-build
  const compositionPath = path.resolve(__dirname, '../../../output/example-build/examples/simple-canvas-animation/composition.html');
  const compositionUrl = `file://${compositionPath}`;

  console.log(`Target composition: ${compositionUrl}`);

  const renderer = new Renderer({
    width: 1280,
    height: 720,
    fps: 30,
    durationInSeconds: 10, // Long enough to ensure we can abort
    mode: 'canvas'
  });

  const controller = new AbortController();
  const signal = controller.signal;

  console.log('Starting render with cancellation scheduled in 2 seconds...');

  setTimeout(() => {
    console.log('Aborting render now!');
    controller.abort();
  }, 2000);

  try {
    await renderer.render(compositionUrl, outputPath, {
      signal,
      onProgress: (p) => {
        console.log(`Progress callback: ${(p * 100).toFixed(1)}%`);
      }
    });
    console.error('Test Failed: Render completed despite cancellation.');
    process.exit(1);
  } catch (err: any) {
    if (err.message === 'Aborted') {
      console.log('Test Passed: Render was successfully aborted.');
      process.exit(0);
    } else {
      console.error('Test Failed: Unexpected error:', err);
      process.exit(1);
    }
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
