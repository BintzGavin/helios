---
id: PERF-065
slug: headless-shell-binary
status: complete
claimed_by: "executor-session"
created: 2024-05-30
completed: ""
result: ""
---
# PERF-065: Leverage Standalone Headless Shell Binary

## Focus Area
Browser Architecture - `Renderer.ts`

## Background Research
The `Renderer.ts` uses Chromium for DOM-to-Video capture. Chromium's full binary architecture introduces heavy sandbox and sub-process synchronization overhead, even when configured with aggressive `--disable-*` flags (PERF-064).
Playwright bundles the full chromium binary by default. However, a minimal, native `chrome-headless-shell` binary compiled specifically for layout/paint tasks devoid of UI and sandbox overheads can theoretically be passed via `executablePath` when launching the browser.

## Benchmark Configuration
- **Composition URL**: `examples/simple-animation/examples/simple-animation/output/build/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 32.100s
- **Bottleneck analysis**: IPC latency between Node and Chromium along with layout/paint calculation overhead in V8 and full-browser background processes.

## Implementation Spec

### Step 1: Update Browser Executable Path
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Modify the method that returns the browser launch options to check for a `chrome-headless-shell` binary explicitly on the Jules microVM (the Executor should dynamically locate this binary) and conditionally set `executablePath` to point to it instead of the default chromium binary.
**Why**: Bypasses the overhead of the full Chromium binary architecture, specifically targeting the native headless shell mode for layout/paint tasks.
**Risk**: Playwright might be incompatible with the standalone headless shell if CDP protocol versions differ, or the binary might not be preinstalled on the Jules VM.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-seek-driver-offsets.ts` to ensure hardware-accelerated modes remain unbroken by the custom executable path.

## Correctness Check
First recreate the `test_perf.ts` script at the project root using the following payload:

`cat << 'TEST_EOF' > test_perf.ts`
`import { Renderer } from './packages/renderer/src/Renderer.js';`
`import path from 'path';`
`async function run() {`
`  const start = Date.now();`
`  const renderer = new Renderer({`
`    mode: 'dom',`
`    width: 600,`
`    height: 600,`
`    fps: 30,`
`    durationInSeconds: 5,`
`    pixelFormat: 'yuv420p',`
`    stabilityTimeout: 30000,`
`  });`
`  await renderer.render(`
`    \`file://\${path.resolve('examples/simple-animation/examples/simple-animation/output/build/composition.html')}\`,`
`    'output.mp4'`
`  );`
`  console.log(\`Render time: \${(Date.now() - start) / 1000}s\`);`
`}`
`run().catch(console.error);`
`TEST_EOF`

Then, run `npx tsx test_perf.ts` to verify the output completes successfully without crashing the newly specified binary.

## Results Summary
- **Best render time**: 32.015s (vs baseline 32.100s)
- **Improvement**: ~0.26%
- **Kept experiments**: Used standalone `chrome-headless-shell` binary to bypass UI/sandbox overhead.
- **Discarded experiments**: none
