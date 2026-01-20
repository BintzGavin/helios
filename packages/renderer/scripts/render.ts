import { Renderer } from '../src/index';
import * as path from 'path';
import * as fs from 'fs/promises';

async function main() {
  console.log('Starting render script...');

  const args = process.argv.slice(2);
  let compositionPathArg = 'output/example-build/examples/simple-canvas-animation/composition.html';
  let outputPathArg = 'output/canvas-animation.mp4';

  // Basic arg parsing: --composition <path> --output <path>
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--composition' && args[i + 1]) {
      compositionPathArg = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputPathArg = args[i + 1];
      i++;
    }
  }

  const renderer = new Renderer({
    width: 600,
    height: 600,
    fps: 30,
    durationInSeconds: 5,
  });

  const compositionPath = path.resolve(process.cwd(), compositionPathArg);
  const compositionUrl = `file://${compositionPath}`;

  const outputPath = path.resolve(process.cwd(), outputPathArg);

  console.log(`Composition: ${compositionUrl}`);
  console.log(`Output: ${outputPath}`);

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
