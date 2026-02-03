import { Renderer } from '../../packages/renderer/src/index';
import * as path from 'path';
import * as fs from 'fs/promises';

async function main() {
  console.log('Starting Excalidraw Architecture render...');

  const renderer = new Renderer({
    width: 960,
    height: 600,
    fps: 30,
    durationInSeconds: 30,
    mode: 'dom', // Excalidraw uses DOM rendering
    stabilityTimeout: 1000, // Extra time for Excalidraw fonts and text rendering to settle
  });

  const compositionPath = path.resolve(
    process.cwd(),
    'output/example-build/examples/excalidraw-animation/composition.html'
  );
  const compositionUrl = `file://${compositionPath}`;

  const outputPath = path.resolve(
    process.cwd(),
    'examples/excalidraw-animation/output/architecture.mp4'
  );

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
