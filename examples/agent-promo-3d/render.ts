import { Renderer } from '../../packages/renderer/src/index.ts';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  const compositionUrl = 'http://localhost:4000/composition.html';
  const outputPath = path.resolve(process.cwd(), 'examples/agent-promo-3d/output/agent-promo.mp4');

  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  }

  console.log('Starting render...');
  console.log(`Source: ${compositionUrl}`);
  console.log(`Output: ${outputPath}`);

  const renderer = new Renderer({
    width: 1280,
    height: 720,
    fps: 30,
    durationInSeconds: 30,
    mode: 'dom', // Essential for capturing CSS3D elements
    videoCodec: 'libx264',
    preset: 'medium', // Balance speed/quality
    crf: 23
  });

  try {
    await renderer.render(compositionUrl, outputPath, {
      onProgress: (p) => {
        const pct = Math.round(p * 100);
        process.stdout.write(`\rProgress: ${pct}%`);
      }
    });
    console.log('\nRender complete!');
  } catch (e) {
    console.error('\nRender failed:', e);
    process.exit(1);
  }
}

main();
