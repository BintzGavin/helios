import { Renderer } from '../src/index';
import * as path from 'path';
import * as fs from 'fs/promises';

async function main() {
  console.log('Starting render script...');

  // Parse arguments
  const args = process.argv.slice(2);
  let exampleName = 'simple-canvas-animation';
  const exampleArgIndex = args.indexOf('--example');
  if (exampleArgIndex !== -1 && args[exampleArgIndex + 1]) {
      exampleName = args[exampleArgIndex + 1];
  }

  console.log(`Rendering example: ${exampleName}`);

  const renderer = new Renderer({
    width: 600,
    height: 600,
    fps: 30,
    durationInSeconds: 5,
  });

  const compositionPath = path.resolve(
    process.cwd(),
    `output/example-build/examples/${exampleName}/composition.html`
  );
  const compositionUrl = `file://${compositionPath}`;

  const outputPath = path.resolve(process.cwd(), `output/${exampleName}.mp4`);

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
