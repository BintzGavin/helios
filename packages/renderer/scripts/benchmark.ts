import { Renderer } from '../src/index.js';
import * as path from 'path';
import * as fs from 'fs/promises';

async function main() {
  const TOTAL_FRAMES = 150;
  const renderer = new Renderer({
    width: 600,
    height: 600,
    fps: 30,
    durationInSeconds: 5,
    mode: 'dom'
  });

  const compositionPath = path.resolve(
    process.cwd(),
    'output/example-build/examples/simple-animation/composition.html'
  );
  const compositionUrl = `file://${compositionPath}`;

  const outputPath = path.resolve(process.cwd(), 'output/dom-animation.mp4');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const start = performance.now();
  await renderer.render(compositionUrl, outputPath);
  const elapsed = (performance.now() - start) / 1000;

  console.log('---');
  console.log(`render_time_s:      ${elapsed.toFixed(3)}`);
  console.log(`total_frames:       ${TOTAL_FRAMES}`);
  console.log(`fps_effective:      ${(TOTAL_FRAMES / elapsed).toFixed(2)}`);
  console.log(`peak_mem_mb:        ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}`);
}

main().catch(console.error);
