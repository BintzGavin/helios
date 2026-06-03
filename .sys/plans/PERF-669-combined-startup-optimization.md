---
id: PERF-669
slug: combined-startup-optimization
status: unclaimed
claimed_by: ""
created: 2024-06-03
completed: ""
result: ""
---

# PERF-669: Eliminate Diagnostic Checks from Render Startup Path

## Focus Area
`packages/renderer/src/Renderer.ts`

## Background Research
Currently in `Renderer.ts`, we perform two diagnostic checks before entering the main `CaptureLoop`:
1. `diagnostics.validateHardwareAcceleration()`: Spawns a synchronous sub-process (`ffmpeg -hwaccels`) which blocks the Node.js event loop.
2. `firstWorker.strategy.diagnose(firstWorker.page)`: Issues a Playwright `page.evaluate` IPC call into the Chromium isolate.

Both of these steps delay the actual frame capture loop and are purely informational (they just log to the console). Since we evaluate wall-clock render time which includes startup, removing these diagnostic side-effects from the critical path should slightly improve the overall end-to-end rendering time.

Users who want diagnostics can still call `renderer.diagnose()`.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames), mp4 libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.35s
- **Bottleneck analysis**: Synchronous sub-process spawning and CDP IPC evaluations blocking startup.

## Implementation Spec

### Step 1: Remove Diagnostic Execution in `render`
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
In the `render` method, remove the following blocks of code:

<<<<<<< SEARCH
    const diagnostics = new Diagnostics(this.options);
    diagnostics.validateHardwareAcceleration();

    const pool = new BrowserPool(this.options);
=======
    const pool = new BrowserPool(this.options);
>>>>>>> REPLACE

<<<<<<< SEARCH
      await pool.init(compositionUrl, jobOptions);

      console.log('Running diagnostics on first page...');
      const firstWorker = pool.workers[0];
      const strategyDiagnostics = await firstWorker.strategy.diagnose(firstWorker.page);
      console.log('[Helios Diagnostics]', JSON.stringify(strategyDiagnostics, null, 2));

      const totalFrames = this.options.frameCount
=======
      await pool.init(compositionUrl, jobOptions);

      const firstWorker = pool.workers[0];

      const totalFrames = this.options.frameCount
>>>>>>> REPLACE

**Why**: Removes event loop blocking operations before the hottest loop.
**Risk**: No diagnostic warnings are printed to the console on every render. This is desirable for production systems anyway.

## Variations
None.

## Correctness Check
Run the DOM render benchmark `npx tsx packages/renderer/scripts/benchmark-perf.ts` and verify output integrity. Run `npm test` inside `packages/renderer`.
