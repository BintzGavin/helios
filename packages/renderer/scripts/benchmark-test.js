import { Renderer } from '../dist/Renderer.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const options = {
    mode: 'dom',
    width: 600,
    height: 600,
    fps: 30,
    durationInSeconds: 5, // 150 frames
  };
  const renderer = new Renderer(options);
  const start = performance.now();
  try {
    const compUrl = 'file://' + path.resolve(__dirname, '../../../output/example-build/examples/simple-canvas-animation/composition.html');
    await renderer.render(compUrl, 'test-output.mp4');
  } catch (err) {
    console.error(err);
  }
  const elapsed = (performance.now() - start) / 1000;
  console.log('---');
  console.log(`render_time_s:      ${elapsed.toFixed(3)}`);
  console.log(`total_frames:       150`);
  console.log(`fps_effective:      ${(150 / elapsed).toFixed(2)}`);
  console.log(`peak_mem_mb:        ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}`);
}

run();
