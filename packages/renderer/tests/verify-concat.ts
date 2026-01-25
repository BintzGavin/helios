import { Renderer, concatenateVideos } from '../src/index';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  console.log('Starting Concatenation Verification...');

  const duration = 0.5; // Render 0.5 seconds per clip
  const fps = 30;

  // We will generate two clips:
  // Clip 1: Frames 0-14
  // Clip 2: Frames 15-29

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
  const clip1Path = path.resolve(__dirname, 'test-output-clip1.mp4');
  const clip2Path = path.resolve(__dirname, 'test-output-clip2.mp4');
  const finalPath = path.resolve(__dirname, 'test-output-concat.mp4');

  // Clean up previous runs
  [clip1Path, clip2Path, finalPath].forEach(p => {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  try {
    // Render Clip 1
    console.log('Rendering Clip 1...');
    const renderer1 = new Renderer({
      width: 600,
      height: 600,
      fps: fps,
      durationInSeconds: duration,
      mode: 'canvas',
      startFrame: 0,
    });
    await renderer1.render(compositionUrl, clip1Path);

    // Render Clip 2
    console.log('Rendering Clip 2...');
    const renderer2 = new Renderer({
      width: 600,
      height: 600,
      fps: fps,
      durationInSeconds: duration,
      mode: 'canvas',
      startFrame: 15,
    });
    await renderer2.render(compositionUrl, clip2Path);

    // Concatenate
    console.log('Concatenating clips...');
    await concatenateVideos([clip1Path, clip2Path], finalPath);

    if (fs.existsSync(finalPath)) {
        const stats = fs.statSync(finalPath);
        if (stats.size > 0) {
            console.log(`✅ Verification Passed! Concatenated video saved to: ${finalPath} (${stats.size} bytes)`);

            // Clean up
            [clip1Path, clip2Path, finalPath].forEach(p => fs.unlinkSync(p));
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
