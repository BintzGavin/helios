import { Renderer } from '../src/index.js';
import { resolve } from 'path';
import { existsSync } from 'fs';

async function runBenchmark() {
  const outputPath = resolve('test-output.mp4');
  const compUrl = 'file://' + resolve('../../output/example-build/examples/dom-benchmark/composition.html');

  if (!existsSync(resolve('../../output/example-build/examples/dom-benchmark/composition.html'))) {
     console.error('File not found: ' + resolve('../../output/example-build/examples/dom-benchmark/composition.html'));
  }

  const renderer = new Renderer({
    durationInSeconds: 3,
    fps: 30,
    width: 1280,
    height: 720,
    mode: 'dom'
  });

  const start = performance.now();
  await renderer.render(compUrl, outputPath);
  const elapsed = (performance.now() - start) / 1000;

  console.log('---');
  console.log(`render_time_s:      ${elapsed.toFixed(3)}`);
  console.log(`total_frames:       90`);
  console.log(`fps_effective:      ${(90 / elapsed).toFixed(2)}`);
  console.log(`peak_mem_mb:        ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}`);

  return elapsed;
}

runBenchmark().catch(console.error);
