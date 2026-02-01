import { Renderer } from '../../packages/renderer/dist/index.js';
import * as path from 'path';
import * as fs from 'fs/promises';

async function main() {
  console.log('Starting render script for Promo Video 2...');

  // Configuration from main.js
  const WIDTH = 1920;
  const HEIGHT = 1080;
  const FPS = 30;
  const DURATION = 30;

  const renderer = new Renderer({
    width: WIDTH,
    height: HEIGHT,
    fps: FPS,
    durationInSeconds: DURATION,
    mode: 'dom', // Use DOM mode to capture HTML/CSS background and overlays
    // High quality encoding settings matching promo-video
    videoCodec: 'libx264',
    crf: 18,
    preset: 'slow',
    pixelFormat: 'yuv420p',
  });

  const compositionPath = path.resolve(
    process.cwd(),
    'output/example-build/examples/promo-video-2/composition.html'
  );

  // Verify file exists
  try {
    await fs.access(compositionPath);
  } catch (e) {
    console.error(`Composition file not found at: ${compositionPath}`);
    console.error('Did you run "npm run build:examples" first?');
    process.exit(1);
  }

  const compositionUrl = `file://${compositionPath}`;

  const outputPath = path.resolve(
    process.cwd(),
    'examples/promo-video-2/output/helios-promo-2.mp4'
  );

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  try {
    console.log(`Rendering ${compositionUrl} to ${outputPath}...`);
    await renderer.render(compositionUrl, outputPath, {
      onProgress: (progress) => {
        const percent = Math.round(progress * 100);
        process.stdout.write(`\rProgress: ${percent}%`);
      }
    });
    console.log(`\nRender finished successfully! Video saved to: ${outputPath}`);
  } catch (error) {
    console.error('Render script failed:', error);
    process.exit(1);
  }
}

main();
