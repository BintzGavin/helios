import { Renderer } from './packages/renderer/dist/index.js';
import * as path from 'path';

async function run() {
  const compositionPath = path.resolve(
    process.cwd(),
    'output/example-build/examples/dom-benchmark/composition.html'
  );
  const compositionUrl = `file://${compositionPath}`;

  const renderer = new Renderer({
    fps: 60,
    videoCodec: 'libx264',
    pixelFormat: 'yuv420p',
    mode: 'dom',
    width: 1920,
    height: 1080,
    durationInSeconds: 5
  });

  const start = performance.now();
  await renderer.render(compositionUrl, 'output.mp4');
  const elapsed = (performance.now() - start) / 1000;

  const TOTAL_FRAMES = 300;
  console.log('---');
  console.log(`render_time_s:      ${elapsed.toFixed(3)}`);
  console.log(`total_frames:       ${TOTAL_FRAMES}`);
  console.log(`fps_effective:      ${(TOTAL_FRAMES / elapsed).toFixed(2)}`);
  console.log(`peak_mem_mb:        ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}`);
}

run().catch(console.error);
