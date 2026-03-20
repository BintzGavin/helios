import { Renderer } from './src/Renderer.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DURATION_S = 3;
const FPS = 30;
const TOTAL_FRAMES = DURATION_S * FPS;

async function runBenchmark() {
  const OUTPUT_PATH = join(__dirname, 'output.mp4');
  if (fs.existsSync(OUTPUT_PATH)) fs.unlinkSync(OUTPUT_PATH);

  const renderer = new Renderer({
    mode: 'dom',
    width: 1280,
    height: 720,
    fps: FPS,
    durationInSeconds: DURATION_S,
    ffmpegPath: process.env.FFMPEG_PATH,
    headless: true
  } as any);

  const compUrl = 'file://' + join(__dirname, 'tests/fixtures/dom-selector.html');

  const start = performance.now();
  await renderer.render(compUrl, OUTPUT_PATH);
  const elapsed = (performance.now() - start) / 1000;

  console.log('---');
  console.log(`render_time_s:      ${elapsed.toFixed(3)}`);
  console.log(`total_frames:       ${TOTAL_FRAMES}`);
  console.log(`fps_effective:      ${(TOTAL_FRAMES / elapsed).toFixed(2)}`);
  console.log(`peak_mem_mb:        ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}`);
}

runBenchmark().catch(console.error);
