import { Renderer } from './packages/renderer/src/Renderer.js';
import { resolve } from 'path';

async function run() {
  const TOTAL_FRAMES = 150;

  const renderer = new Renderer({
    mode: 'dom',
    fps: 30,
    duration: 5,
    width: 1280,
    height: 720,
    concurrency: 1, // cpu only
    headless: true,
  });

  const start = performance.now();
  await renderer.render('file://' + resolve('./packages/renderer/tests/fixtures/benchmark-composition.html'), 'output.mp4');
  const elapsed = (performance.now() - start) / 1000;

  console.log('---');
  console.log(`render_time_s:      ${elapsed.toFixed(3)}`);
  console.log(`total_frames:       ${TOTAL_FRAMES}`);
  console.log(`fps_effective:      ${(TOTAL_FRAMES / elapsed).toFixed(2)}`);
  console.log(`peak_mem_mb:        ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}`);
}

run().catch(console.error);
