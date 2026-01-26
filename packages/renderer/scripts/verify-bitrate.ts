import { Renderer } from '../src/index';
import * as path from 'path';
import * as fs from 'fs/promises';

async function main() {
  console.log('Starting bitrate verification script...');

  const renderer = new Renderer({
    width: 600,
    height: 600,
    fps: 30,
    durationInSeconds: 1,
    mode: 'canvas',
    videoBitrate: '50M'
  });

  const compositionPath = path.resolve(
    process.cwd(),
    'output/example-build/examples/simple-canvas-animation/composition.html'
  );
  const compositionUrl = `file://${compositionPath}`;

  const outputPath = path.resolve(process.cwd(), 'output/verify-bitrate.mp4');

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  try {
    await renderer.render(compositionUrl, outputPath);
    console.log(`Render finished successfully! Video saved to: ${outputPath}`);
  } catch (error) {
    console.error('Render script failed:', error);
    process.exit(1);
  }
}

main();
