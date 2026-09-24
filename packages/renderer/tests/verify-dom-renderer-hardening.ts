import assert from 'node:assert/strict';
import { BrowserPool } from '../src/core/BrowserPool.js';
import { CdpTimeDriver } from '../src/drivers/CdpTimeDriver.js';
import { SeekTimeDriver } from '../src/drivers/SeekTimeDriver.js';
import { DomStrategy } from '../src/strategies/DomStrategy.js';
import type { RendererOptions } from '../src/types.js';

const baseOptions: RendererOptions = {
  width: 320,
  height: 180,
  fps: 30,
  durationInSeconds: 1,
  stabilityTimeout: 100,
};

async function verifyModeSpecificLaunchArguments(): Promise<void> {
  const domArgs = new BrowserPool({ ...baseOptions, mode: 'dom' }).getLaunchOptions().args;
  const canvasArgs = new BrowserPool({ ...baseOptions, mode: 'canvas' }).getLaunchOptions().args;

  assert.ok(!domArgs.includes('--enable-begin-frame-control'), 'DOM mode must not enable explicit begin-frame control');
  assert.ok(!domArgs.includes('--run-all-compositor-stages-before-draw'), 'DOM mode must not require begin-frame compositor stages');
  assert.ok(canvasArgs.includes('--enable-begin-frame-control'), 'Canvas mode must preserve its existing begin-frame launch behavior');
  assert.ok(canvasArgs.includes('--run-all-compositor-stages-before-draw'), 'Canvas mode must preserve its existing compositor launch behavior');

  // GPU (or SwiftShader) stays available unless disabled explicitly; without it pages get no WebGL.
  assert.ok(!domArgs.includes('--disable-gpu') && !canvasArgs.includes('--disable-gpu'), 'GPU must be enabled by default');
  assert.ok(!canvasArgs.includes('--disable-software-rasterizer'), 'The software rasterizer must stay available by default');
  const noGpuArgs = new BrowserPool({ ...baseOptions, mode: 'canvas', browserConfig: { gpu: false } }).getLaunchOptions().args;
  assert.ok(noGpuArgs.includes('--disable-gpu'), 'browserConfig.gpu: false must disable the GPU');
}

async function verifyModeSelectsTheCorrectClock(): Promise<void> {
  const canvasPage = 'data:text/html,<html><body><canvas width="320" height="180"></canvas></body></html>';
  const domPool = new BrowserPool({ ...baseOptions, mode: 'dom' });
  const canvasPool = new BrowserPool({ ...baseOptions, mode: 'canvas' });
  const legacyCanvasPool = new BrowserPool({ ...baseOptions, mode: 'canvas' });
  const previousClock = process.env.HELIOS_CANVAS_SEEK_CLOCK;

  try {
    await domPool.init('data:text/html,<html><body><div>DOM</div></body></html>');
    const domDriver = domPool.workers[0].timeDriver;
    assert.ok(domDriver instanceof SeekTimeDriver, 'DOM mode must use SeekTimeDriver');
    assert.equal((domDriver as any).flushAnimationFrames, false, 'DOM mode relies on screenshots to run animation frames');

    // Canvas mode seeks the page to each frame's time too. CDP virtual time let rAF-driven and
    // Helios-bound canvases follow the wall clock, so it is opt-in for comparison only.
    await canvasPool.init(canvasPage);
    const canvasDriver = canvasPool.workers[0].timeDriver;
    assert.ok(canvasDriver instanceof SeekTimeDriver, 'Canvas mode must use SeekTimeDriver');
    assert.equal((canvasDriver as any).flushAnimationFrames, true, 'Canvas mode must flush rAF callbacks on every seek');

    process.env.HELIOS_CANVAS_SEEK_CLOCK = '0';
    await legacyCanvasPool.init(canvasPage);
    assert.ok(legacyCanvasPool.workers[0].timeDriver instanceof CdpTimeDriver, 'HELIOS_CANVAS_SEEK_CLOCK=0 must select CdpTimeDriver');
  } finally {
    if (previousClock === undefined) delete process.env.HELIOS_CANVAS_SEEK_CLOCK;
    else process.env.HELIOS_CANVAS_SEEK_CLOCK = previousClock;
    await Promise.all([
      domPool.close().catch(() => {}),
      canvasPool.close().catch(() => {}),
      legacyCanvasPool.close().catch(() => {}),
    ]);
    await Promise.all([
      domPool.cleanupStrategies().catch(() => {}),
      canvasPool.cleanupStrategies().catch(() => {}),
      legacyCanvasPool.cleanupStrategies().catch(() => {}),
    ]);
  }
}

async function verifyDomCaptureHasAWatchdog(): Promise<void> {
  const strategy = new DomStrategy({
    ...baseOptions,
    mode: 'dom',
    stabilityTimeout: 20,
  });

  (strategy as any).cdpSession = {
    send: () => new Promise(() => {}),
  };

  let guard: ReturnType<typeof setTimeout> | undefined;
  const guardedCapture = Promise.race([
    strategy.capture({} as any, 125),
    new Promise((_, reject) => {
      guard = setTimeout(() => reject(new Error('acceptance check timed out waiting for the capture watchdog')), 250);
    }),
  ]);

  try {
    await assert.rejects(
      guardedCapture,
      /DomStrategy\.capture watchdog: Page\.captureScreenshot exceeded 20ms \(frameTime=125\)/,
    );
  } finally {
    if (guard) clearTimeout(guard);
  }
}

const checks: Array<[string, () => Promise<void>]> = [
  ['mode-specific browser launch arguments', verifyModeSpecificLaunchArguments],
  ['mode-specific time drivers', verifyModeSelectsTheCorrectClock],
  ['DOM screenshot capture watchdog', verifyDomCaptureHasAWatchdog],
];

let failures = 0;

for (const [name, check] of checks) {
  try {
    await check();
    console.log(`✅ ${name}`);
  } catch (error) {
    failures++;
    console.error(`❌ ${name}`);
    console.error(error);
  }
}

if (failures > 0) {
  throw new Error(`${failures} DOM renderer hardening acceptance check(s) failed`);
}
