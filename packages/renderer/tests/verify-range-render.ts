import { Renderer } from '../src/index';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  console.log('Starting Range Render Verification...');

  const duration = 1; // Render 1 second
  const fps = 30;
  const startFrame = 30; // Start from 1s (frame 30)

  // We are rendering frames 30-59 (1s to 2s) of the composition.
  // The output video will be 1 second long.

  const renderer = new Renderer({
    width: 600,
    height: 600,
    fps: fps,
    durationInSeconds: duration,
    mode: 'canvas',
    startFrame: startFrame,
  });

  // Try to use the built artifact first, fall back to source
  const rootDir = path.resolve(__dirname, '../../..');
  let compositionPath = path.resolve(
    rootDir,
    'output/example-build/examples/simple-canvas-animation/composition.html'
  );

  if (!fs.existsSync(compositionPath)) {
      console.log('Build artifact not found, trying source...');
      compositionPath = path.resolve(
          rootDir,
          'examples/simple-canvas-animation/composition.html'
      );
  }

  if (!fs.existsSync(compositionPath)) {
      console.error(`❌ Composition file not found at: ${compositionPath}`);
      process.exit(1);
  }

  const compositionUrl = `file://${compositionPath}`;
  const outputPath = path.resolve(__dirname, 'test-output-range.mp4');

  try {
    if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
    }

    console.log(`Rendering range: startFrame=${startFrame}, duration=${duration}s...`);
    console.log(`Composition: ${compositionUrl}`);

    await renderer.render(compositionUrl, outputPath);

    if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        if (stats.size > 0) {
            console.log(`✅ Verification Passed! Video saved to: ${outputPath} (${stats.size} bytes)`);
            process.exit(0);
        } else {
             console.error(`❌ Verification Failed: Output file is empty.`);
             process.exit(1);
        }
    } else {
        console.error(`❌ Verification Failed: Output file was not created.`);
        process.exit(1);
    }

  } catch (error) {
    console.error(`❌ Verification Failed:`, error);
    process.exit(1);
  }
}

main();
