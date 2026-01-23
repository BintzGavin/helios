import { Renderer } from '../../packages/renderer/src/index';
import * as path from 'path';
import * as fs from 'fs/promises';

async function main() {
  console.log('Starting Vue verification render...');

  const renderer = new Renderer({
    width: 600,
    height: 600,
    fps: 30,
    durationInSeconds: 5,
  });

  const compositionPath = path.resolve(
    process.cwd(),
    'output/example-build/examples/vue-canvas-animation/composition.html'
  );
  const compositionUrl = `file://${compositionPath}`;

  const outputPath = path.resolve(process.cwd(), 'output/vue-render-verified.mp4');

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  try {
    await renderer.render(compositionUrl, outputPath);
    console.log(`Verification passed! Video saved to: ${outputPath}`);
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

main();
