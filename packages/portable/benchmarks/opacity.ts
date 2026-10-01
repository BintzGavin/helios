import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parsePlan } from '../src/plan.js';
import { prepareScene } from '../src/render.js';
import { digest } from '../src/storage.js';
import { SkiaRasterizer } from '../src/skia.js';

const args = process.argv.slice(2), option = (name: string, fallback = '') => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const reference = option('--reference');
if (!reference) throw new Error('--reference must point to the frozen portable package');
const directory = resolve(option('--out', '/tmp/helios-opacity-benchmark'));
await mkdir(directory, { recursive: true });
const Baseline = (await import(pathToFileURL(join(resolve(reference), 'src/skia.ts')).href)).SkiaRasterizer;
const fontPath = new URL('../tests/fixtures/fonts/NotoSans-Regular.ttf', import.meta.url), font = await readFile(fontPath);
const assets = new Map([['font', fontPath.pathname]]), results: any[] = [];
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
for (const opacity of [1, 0.5]) {
  const plan = parsePlan({ version: 'portable-v1', width: 1920, height: 1080, fps: { num: 30, den: 1 }, frameCount: 20, background: '#0b1020', assets: { font: { type: 'font', sha256: digest(font), bytes: font.length } }, nodes: Array.from({ length: 200 }, (_, index) => ({ id: `n${index}`, type: 'text', text: `${index} office`, fonts: ['font'], fontSize: 12, width: 100, x: index % 20 * 95, y: Math.floor(index / 20) * 90, fill: '#ffffff', opacity, transform: { rotation: { keyframes: [{ frame: 0, value: 0 }, { frame: 19, value: 1 }] } } })) });
  const samples = new Map<string, Buffer>(), times: Record<string, number[]> = { baseline: [], candidate: [] };
  for (let round = 0; round < 3; round++) for (const variant of round % 2 ? ['candidate', 'baseline'] : ['baseline', 'candidate']) {
    const scene = new (variant === 'baseline' ? Baseline : SkiaRasterizer)(plan, await prepareScene(plan, assets)); await scene.prepare();
    const started = performance.now();
    for (let frame = 0; frame < plan.frameCount; frame++) {
      const pixels = scene.render(frame).pixels;
      if (round === 0 && (frame === 0 || frame === 19)) samples.set(`${variant}-${frame}`, pixels);
    }
    times[variant].push(performance.now() - started);
  }
  let maxChannelDifference = 0, differingChannels = 0;
  for (const frame of [0, 19]) {
    const before = samples.get(`baseline-${frame}`)!, after = samples.get(`candidate-${frame}`)!;
    if (before.length !== after.length) throw new Error('Output dimensions changed');
    for (let index = 0; index < before.length; index++) {
      const difference = Math.abs(before[index] - after[index]);
      maxChannelDifference = Math.max(maxChannelDifference, difference); differingChannels += Number(difference !== 0);
    }
  }
  const baselineMs = median(times.baseline), candidateMs = median(times.candidate);
  results.push({ opacity, frames: plan.frameCount, nodes: plan.nodes.length, repeats: 3, times, baselineMs, candidateMs, speedup: baselineMs / candidateMs, maxChannelDifference, differingChannels });
}
const passed = results.every(row => row.maxChannelDifference <= 2) && results[1].candidateMs < results[1].baselineMs / 2;
const evidence = { note: 'Sequential alternating rasterization-only measurements, excluding preparation and encoding. Same process; OS caches uncontrolled. Two uncompressed full frames checked for each opacity. Requires at least 2x translucent-text improvement and maximum channel difference of two.', results, passed };
await writeFile(join(directory, 'results.json'), JSON.stringify(evidence, null, 2)); console.log(JSON.stringify(evidence));
if (!passed) process.exitCode = 1;
