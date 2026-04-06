import { Renderer } from '../../src/Renderer.js';
import path from 'path';

async function run() {
  const renderer = new Renderer({
    mode: 'dom',
    width: 1280,
    height: 720,
    fps: 30,
    durationInSeconds: 5,
  });

  const start = performance.now();
  await renderer.render('file:///app/examples/simple-animation/composition.html', path.resolve('output.mp4'));
  const elapsed = (performance.now() - start) / 1000;

  const totalFrames = 30 * 5;
  console.log('---');
  console.log(`render_time_s:      ${elapsed.toFixed(3)}`);
  console.log(`total_frames:       ${totalFrames}`);
  console.log(`fps_effective:      ${(totalFrames / elapsed).toFixed(2)}`);
  console.log(`peak_mem_mb:        ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}`);
}

run().catch(console.error);
