import { Renderer } from '../src/index';
import * as path from 'path';
import * as fs from 'fs/promises';

async function main() {
  console.log('Starting DOM strategy verification script...');

  const renderer = new Renderer({
    width: 600,
    height: 600,
    fps: 30,
    durationInSeconds: 1, // Short duration for quick verification
    mode: 'dom'
  });

  const compositionPath = path.resolve(
    __dirname,
    'fixtures/background-image.html'
  );
  const compositionUrl = `file://${compositionPath}`;

  const outputPath = path.resolve(process.cwd(), 'output/verify-dom.mp4');

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  console.log(`Rendering ${compositionUrl} to ${outputPath} using DOM strategy...`);

  try {
    await renderer.render(compositionUrl, outputPath);
    console.log(`Render finished successfully! Video saved to: ${outputPath}`);

    // Check if file exists and has size > 0
    const stats = await fs.stat(outputPath);
    if (stats.size > 0) {
        console.log(`Verification Passed: Output file created (${stats.size} bytes).`);
    } else {
        throw new Error('Output file is empty.');
    }

  } catch (error) {
    console.error('Verification script failed:', error);
    process.exit(1);
  }
}

main();
