---
id: PERF-043
slug: optimize-captureloop
status: complete
claimed_by: "executor-session"
created: 2024-05-15
completed: 2024-05-15
result: improved
---
# PERF-043: Optimize captureLoop Array Allocation and Promise Chaining

## Focus Area
Frame Capture Loop & ffmpeg write efficiency.

## Background Research
The dominant bottleneck in the DOM render mode is Chromium's `Page.captureScreenshot` execution and IPC overhead. In `Renderer.ts`, the `captureLoop` iterates to generate and write frames. Currently it uses `framePromises.shift()!` which shifts elements off an array. This can be slow for a very large number of frames due to array re-allocation (O(N) operation per frame). Furthermore, `previousWritePromise` is awaited before every ffmpeg write, and a new `Promise` wrapper is created even when `.write()` returns `true` (indicating no backpressure). By avoiding `shift()` and only creating a Promise when `.write()` returns `false`, we reduce garbage collection pressure and event loop overhead.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/tests/fixtures/simple-animation.html`
- **Render Settings**: 600x600, 30fps, 150 frames (5 seconds), JPEG intermediate format
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.7s
- **Bottleneck analysis**: Unnecessary CPU overhead from array reallocation and microtask queueing during synchronous stream writes.

## Implementation Spec

### Step 1: Optimize ffmpeg stream writing and array allocations in capture loop
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
In the `captureLoop` inside `Renderer.ts`:
1. Do not use array `shift()`. Instead, access elements by index (e.g., using `nextFrameToWrite`) and then clear the reference to avoid memory leaks.
2. Optimize `previousWritePromise` by only creating a new Promise if `ffmpegProcess.stdin.write` returns `false` (indicating stream backpressure). If it returns `true`, just continue.

**Why**: Reducing Promise instantiations on the hot path (which executes 30 times a second or more) can reduce V8 garbage collection pressure and micro-task queue overhead. Array `shift()` is O(N), so removing it makes the loop O(1) per frame.
**Risk**: Proper handling of stream errors and memory consumption.

## Canvas Smoke Test
Run the Canvas baseline script to ensure basic rendering still works.
`npx tsx test-benchmark.ts` (with `mode: 'canvas'`)

## Correctness Check
Run the DOM render script and verify output exists and has valid video contents.
`npx tsx test-benchmark.ts`

## Prior Art
- PERF-028: Eliminated array allocations in SeekTimeDriver.

## Results Summary
- **Best render time**: 32.408s (vs baseline 33.696s)
- **Improvement**: 3.8%
- **Kept experiments**: Optimized `captureLoop` to use index access instead of `array.shift()` and conditionally instantiate promises when FFmpeg stdin backpressure occurs.
- **Discarded experiments**: none
