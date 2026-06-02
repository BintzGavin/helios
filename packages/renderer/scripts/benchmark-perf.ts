import { Renderer } from '../src/index';
import * as path from 'path';
import * as fs from 'fs/promises';

async function main() {
  const renderer = new Renderer({
    width: 600,
    height: 600,
    fps: 30,
    durationInSeconds: 5,
    mode: 'dom',
    intermediateImageFormat: 'png'
  });

  const compositionPath = path.resolve(
    process.cwd(),
    'examples/dom-benchmark/composition.html'
  );
  const compositionUrl = `file://${compositionPath}`;
  const outputPath = path.resolve(process.cwd(), 'output/dom-benchmark.mp4');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const start = performance.now();
  await renderer.render(compositionUrl, outputPath);
  const elapsed = (performance.now() - start) / 1000;

  const TOTAL_FRAMES = 30 * 5;

  console.log('---');
  console.log(`render_time_s:      ${elapsed.toFixed(3)}`);
  console.log(`total_frames:       ${TOTAL_FRAMES}`);
  console.log(`fps_effective:      ${(TOTAL_FRAMES / elapsed).toFixed(2)}`);
  console.log(`peak_mem_mb:        ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
