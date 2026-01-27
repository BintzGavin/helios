import { Renderer } from '../src/index';
import * as path from 'path';
import * as fs from 'fs/promises';

async function main() {
  console.log('Starting manual verification for Configurable Screenshot Format...');

  const outputPath = path.resolve(process.cwd(), 'output/verify-format.mp4');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const renderer = new Renderer({
    width: 640,
    height: 480,
    fps: 30,
    durationInSeconds: 2,
    mode: 'dom',
    intermediateImageFormat: 'jpeg',
    intermediateImageQuality: 50,
    videoCodec: 'libx264'
  });

  const compositionUrl = `file://${path.resolve(__dirname, '../scripts/fixtures/simple-box.html')}`;

  try {
    console.log(`Rendering ${compositionUrl} to ${outputPath}...`);
    console.log('Using format: jpeg, quality: 50');

    await renderer.render(compositionUrl, outputPath);

    console.log('✅ Render completed successfully.');
    console.log(`Output saved to: ${outputPath}`);

    // Verify output file exists and has size > 0
    const stats = await fs.stat(outputPath);
    if (stats.size > 0) {
        console.log(`✅ Output file exists (Size: ${stats.size} bytes).`);
    } else {
        throw new Error('Output file is empty.');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

main();
