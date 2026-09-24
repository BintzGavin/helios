/**
 * Frame-exactness acceptance check for the page shapes agents actually write.
 *
 * Each fixture moves a 20px white box 100px/s across a black 320x180 frame, so frame i of
 * a render at `fps` must show the box at x = 100 * i / fps (10px per frame at 10 fps).
 * A renderer that follows the wall clock instead of the requested frame time shows
 * small, irregular steps (or none), and fails here.
 *
 * Also checks that the encoded duration matches frames / fps, that pages which never
 * define `window.helios` do not stall on start-up, and that a Helios composition rendered
 * at a different fps than its own does not wait out the stability timeout on every frame.
 */
import { Renderer } from '../src/index';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WIDTH = 320;
const HEIGHT = 180;
const PX_PER_SECOND = 100;
const MAX_RENDER_SECONDS = 20; // A start-up stall waits out a 30s timeout.

interface Case {
  fixture: string;
  mode: 'canvas' | 'dom';
  label: string;
  fps?: number;
  duration?: number;
  stabilityTimeout?: number;
}

const CASES: Case[] = [
  { fixture: 'frame-exact-helios-canvas.html', mode: 'canvas', label: 'Helios canvas page (bindToDocumentTimeline + subscribe)' },
  { fixture: 'frame-exact-raf-canvas.html', mode: 'canvas', label: 'stateful rAF loop' },
  { fixture: 'frame-exact-render-at.html', mode: 'canvas', label: 'window.renderAt(t) hook' },
  { fixture: 'frame-exact-seek-async.html', mode: 'canvas', label: 'async window.seek(t) hook' },
  { fixture: 'frame-exact-seek-dom.html', mode: 'dom', label: 'window.seek(t) hook, DOM mode' },
  // The composition runs at 10 fps; rendering it at 30 fps asks for frames between its own.
  // A short stability timeout makes a per-frame stall show up as a slow render.
  { fixture: 'frame-exact-helios-canvas.html', mode: 'canvas', label: 'Helios canvas page rendered at 30 fps', fps: 30, duration: 1, stabilityTimeout: 3000 },
  { fixture: 'frame-exact-helios-canvas.html', mode: 'dom', label: 'Helios canvas page rendered at 30 fps, DOM mode', fps: 30, duration: 1, stabilityTimeout: 3000 },
];

function ensureCoreBuilt() {
  const coreDist = path.resolve(__dirname, '../../core/dist/index.js');
  if (fs.existsSync(coreDist)) return;
  console.log('Building @helios-project/core (fixture pages import its dist)...');
  const result = spawnSync('npx', ['tsc', '-p', path.resolve(__dirname, '../../core')], { stdio: 'inherit', shell: true });
  if (result.status !== 0 || !fs.existsSync(coreDist)) {
    throw new Error('Could not build packages/core; run `npm run build -w packages/core` first.');
  }
}

function decodeBoxPositions(videoPath: string): number[] {
  const result = spawnSync(ffmpegInstaller.path, [
    '-v', 'error', '-i', videoPath, '-f', 'rawvideo', '-pix_fmt', 'gray', '-',
  ], { maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(`ffmpeg decode failed: ${result.stderr?.toString()}`);
  }
  const raw: Buffer = result.stdout;
  const frameSize = WIDTH * HEIGHT;
  const count = Math.floor(raw.length / frameSize);
  const row = 90; // Through the middle of the box (y 80..100).
  const positions: number[] = [];
  for (let f = 0; f < count; f++) {
    const offset = f * frameSize + row * WIDTH;
    let x = -1;
    for (let px = 0; px < WIDTH; px++) {
      if (raw[offset + px] > 128) { x = px; break; }
    }
    positions.push(x);
  }
  return positions;
}

function probeDurationSeconds(videoPath: string): number {
  const result = spawnSync(ffmpegInstaller.path, ['-i', videoPath], { encoding: 'utf8' });
  const match = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(result.stderr || '');
  if (!match) return NaN;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

async function runCase(testCase: Case, outDir: string): Promise<string[]> {
  const errors: string[] = [];
  const outputPath = path.join(outDir, `${testCase.fixture.replace('.html', '')}-${testCase.mode}-${testCase.fps ?? 10}.mp4`);
  const url = pathToFileURL(path.join(__dirname, 'fixtures', testCase.fixture)).href;

  const fps = testCase.fps ?? 10;
  const durationInSeconds = testCase.duration ?? 2;
  const frames = fps * durationInSeconds;
  const renderer = new Renderer({
    width: WIDTH,
    height: HEIGHT,
    fps,
    durationInSeconds,
    mode: testCase.mode,
    ...(testCase.stabilityTimeout ? { stabilityTimeout: testCase.stabilityTimeout } : {}),
  });

  const started = Date.now();
  await renderer.render(url, outputPath);
  const seconds = (Date.now() - started) / 1000;

  const positions = decodeBoxPositions(outputPath);
  const expected = Array.from({ length: frames }, (_, i) => Math.round((i * PX_PER_SECOND) / fps));

  if (positions.length !== frames) {
    errors.push(`decoded ${positions.length} frames, expected ${frames}`);
  }
  const wrong = expected
    .map((x, i) => ({ i, x, got: positions[i] }))
    .filter(({ x, got }) => got === undefined || Math.abs(got - x) > 1);
  if (wrong.length > 0) {
    errors.push(`box position wrong on ${wrong.length}/${frames} frames; got x = [${positions.join(', ')}], expected [${expected.join(', ')}]`);
  }

  const duration = probeDurationSeconds(outputPath);
  if (!(Math.abs(duration - durationInSeconds) < 0.05)) {
    errors.push(`encoded duration ${duration}s, expected ${durationInSeconds}s`);
  }

  if (seconds > MAX_RENDER_SECONDS) {
    errors.push(`render took ${seconds.toFixed(1)}s (limit ${MAX_RENDER_SECONDS}s): it stalled`);
  }

  console.log(`${errors.length ? '❌' : '✅'} ${testCase.label} [${testCase.mode}] in ${seconds.toFixed(1)}s`);
  for (const e of errors) console.log(`     ${e}`);
  return errors.map((e) => `${testCase.label}: ${e}`);
}

async function main() {
  ensureCoreBuilt();
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helios-frame-exact-'));
  const failures: string[] = [];
  try {
    for (const testCase of CASES) {
      try {
        failures.push(...await runCase(testCase, outDir));
      } catch (err: any) {
        console.log(`❌ ${testCase.label} [${testCase.mode}] threw: ${err?.message || err}`);
        failures.push(`${testCase.label}: threw ${err?.message || err}`);
      }
    }
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    console.error(`\n❌ ${failures.length} frame-exactness check(s) failed.`);
    process.exit(1);
  }
  console.log('\n✅ All pages render frame-exact at the requested duration.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
