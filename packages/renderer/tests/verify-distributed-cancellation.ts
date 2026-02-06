
import { RenderOrchestrator } from '../src/Orchestrator.js';
import { Renderer } from '../src/Renderer.js';
import { RenderJobOptions, RendererOptions } from '../src/types.js';

// Mock Renderer to simulate distributed workers
const originalRender = Renderer.prototype.render;

let worker1Called = false;
let worker2Called = false;
let worker2Aborted = false;

Renderer.prototype.render = async function(compositionUrl: string, outputPath: string, jobOptions?: RenderJobOptions): Promise<void> {
  // We identify workers by the output path (part_0, part_1)
  if (outputPath.includes('part_0')) {
    console.log('[Mock Worker 1] Started. Failing immediately...');
    worker1Called = true;
    throw new Error('Worker 1 Simulated Failure');
  }

  if (outputPath.includes('part_1')) {
    console.log('[Mock Worker 2] Started. Waiting...');
    worker2Called = true;

    return new Promise<void>((resolve, reject) => {
        const signal = jobOptions?.signal;
        if (signal) {
            if (signal.aborted) {
                console.log('[Mock Worker 2] Already aborted!');
                worker2Aborted = true;
                reject(new Error('Aborted'));
                return;
            }
            signal.addEventListener('abort', () => {
                console.log('[Mock Worker 2] Received abort signal!');
                worker2Aborted = true;
                reject(new Error('Aborted'));
            });
        }

        // Wait forever (or until timeout) unless aborted
        setTimeout(() => {
            if (!worker2Aborted) {
                console.log('[Mock Worker 2] Timed out waiting for abort!');
                resolve();
            }
        }, 5000);
    });
  }

  // Fallback for non-distributed or other calls
  return originalRender.apply(this, [compositionUrl, outputPath, jobOptions]);
};

async function runTest() {
  console.log('Starting Distributed Cancellation Verification...');

  const options: RendererOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 2, // 60 frames total
    frameCount: 60,
    concurrency: 2,
    mode: 'canvas', // irrelevant for mock
    ffmpegPath: 'mock-ffmpeg',
  };

  try {
    await RenderOrchestrator.render('mock-url', 'output/final.mp4', options);
  } catch (err: any) {
    console.log(`Caught expected error: ${err.message}`);
  }

  // Verification Logic
  if (!worker1Called) {
    console.error('FAILED: Worker 1 was not called.');
    process.exit(1);
  }
  if (!worker2Called) {
    console.error('FAILED: Worker 2 was not called.');
    process.exit(1);
  }
  if (!worker2Aborted) {
    console.error('FAILED: Worker 2 was NOT aborted after Worker 1 failed.');
    process.exit(1);
  }

  console.log('SUCCESS: Worker 2 was correctly aborted when Worker 1 failed.');
}

runTest().catch(err => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
