import { RenderOrchestrator } from '../src/index.js';
import * as path from 'path';
import * as fs from 'fs/promises';

async function main() {
  console.log('Starting distributed render verification...');

  const options = {
    width: 600,
    height: 600,
    fps: 30,
    durationInSeconds: 4, // 120 frames
    concurrency: 2, // Should spawn 2 workers, 60 frames each
  };

  const compositionPath = path.resolve(
    process.cwd(),
    'output/example-build/examples/simple-canvas-animation/composition.html'
  );
  const compositionUrl = `file://${compositionPath}`;

  const outputPath = path.resolve(process.cwd(), 'output/distributed-render.mp4');

  try {
      await fs.rm(outputPath);
  } catch(e) {}

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  try {
    const start = Date.now();
    await RenderOrchestrator.render(compositionUrl, outputPath, options);
    const end = Date.now();
    console.log(`Render finished successfully in ${(end - start) / 1000}s! Video saved to: ${outputPath}`);

    // Basic verification
    const stat = await fs.stat(outputPath);
    if (stat.size > 0) {
        console.log('Output file exists and has content.');
    } else {
        throw new Error('Output file is empty');
    }

  } catch (error) {
    console.error('Distributed render failed:', error);
    process.exit(1);
  }
}

main();
