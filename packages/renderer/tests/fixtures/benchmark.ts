import { Renderer } from '../../src/Renderer.js';
import { RendererOptions } from '../../src/types.js';
import * as path from 'path';

async function run() {
  const options: RendererOptions = {
    fps: 60,
    width: 1920,
    height: 1080,
    codec: 'libx264',
    mode: 'dom',
    durationInSeconds: 10,
    headless: true,
  };
  const renderer = new Renderer(options);
  const start = performance.now();
  try {
    await renderer.render('file:///app/examples/simple-animation/composition.html', 'output.mp4');
  } catch (e) {
    console.error(e);
  } finally {
    const elapsed = (performance.now() - start) / 1000;
    const totalFrames = 60 * 10;
    console.log('---');
    console.log(`render_time_s:      ${elapsed.toFixed(3)}`);
    console.log(`total_frames:       ${totalFrames}`);
    console.log(`fps_effective:      ${(totalFrames / elapsed).toFixed(2)}`);
    console.log(`peak_mem_mb:        ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}`);
  }
}

run();
