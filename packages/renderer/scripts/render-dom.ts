import { Renderer } from '../src/index';
import * as path from 'path';
import * as fs from 'fs/promises';

async function main() {
  console.log('Starting DOM render script...');

  const renderer = new Renderer({
    width: 600,
    height: 600,
    fps: 30,
    durationInSeconds: 5,
    mode: 'dom'
  });

  // Target the built artifact
  const compositionPath = path.resolve(
    process.cwd(),
    'output/example-build/examples/simple-animation/composition.html'
  );
  const compositionUrl = `file://${compositionPath}`;

  const outputPath = path.resolve(process.cwd(), 'output/dom-animation.mp4');

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  console.log(`Rendering ${compositionUrl} to ${outputPath} using DOM strategy...`);

  try {
    // Verify file exists first
    try {
        await fs.access(compositionPath);
    } catch (e) {
        throw new Error(`Composition file not found at ${compositionPath}. Did you run 'npm run build:examples'?`);
    }

    await renderer.render(compositionUrl, outputPath);
    console.log(`Render finished successfully! Video saved to: ${outputPath}`);
  } catch (error) {
    console.error('Render script failed:', error);
    process.exit(1);
  }
}

main();
