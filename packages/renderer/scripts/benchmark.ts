// DOM render benchmark harness used by the RENDERER performance workflow
// (see docs/prompts/execution-renderer.md). Run from packages/renderer after
// `npm run build:examples` at the repo root:
//   npx tsx scripts/benchmark.ts > run.log 2>&1
import { Renderer } from '../src/index.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

async function run() {
  const compositionPath = path.join(
    REPO_ROOT,
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
