---
id: PERF-533
slug: optimize-ffmepg-threads-contention
status: complete
claimed_by: "executor-session"
created: 2025-02-27
completed: 2026-05-18
result: no-improvement
---

# PERF-533: Limit FFmpeg Threads to Reduce CPU Contention

## Focus Area
`packages/renderer/src/utils/FFmpegBuilder.ts` - Video encoding arguments.

## Background Research
Currently, the pipeline launches Chromium with `--process-per-tab` to enable fully isolated multi-core frame capture. By default, our `BrowserPool` creates `Math.max(1, (os.cpus().length || 4) - 1)` worker pages. On a typical 4-core machine, this spawns 3 isolated Chromium renderer processes that all run parallel `HeadlessExperimental.beginFrame` loops.

However, we pipe these frames into a single FFmpeg process encoding to `libx264`. By default, FFmpeg's `libx264` encoder spins up multiple threads based on available CPU cores. These FFmpeg threads continuously wake up to process small bursts of frames, fighting for CPU cycles with the 3 Chromium processes and the main Node.js orchestrator.

Because we use the `ultrafast` preset for `libx264`, FFmpeg is extremely fast and is *not* the bottleneck in our pipeline. Leaving its thread count unbounded causes heavy thread contention and context switching overhead across the OS scheduler.

By explicitly limiting `libx264` to use a minimal number of threads (`-threads 1` or `-threads 2`), we dedicate more stable CPU time to the actual bottlenecks: Chromium's V8 Javascript execution and Playwright CDP IPC serialization.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, mode dom, 1920x1080 60FPS
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~16.306s (based on PERF-529 results baseline or median)
- **Bottleneck analysis**: Thread contention between Playwright, isolated Chromium workers, and unbounded FFmpeg threads during the hot loop.

## Implementation Spec

### Step 1: Add `-threads` Argument to FFmpeg Video Encoding
**File**: `packages/renderer/src/utils/FFmpegBuilder.ts`
**What to change**:
In the `getArgs` method, inside the block handling the video codec, append the `-threads` option with a value of `1` (or `2` depending on variations).

```typescript
<<<<<<< SEARCH
    // Video Encoding Args
    finalArgs.push('-c:v', videoCodec);

    if (videoCodec === 'copy') {
=======
    // Video Encoding Args
    finalArgs.push('-c:v', videoCodec);

    // Limit thread contention with Chromium/Node
    finalArgs.push('-threads', '1');

    if (videoCodec === 'copy') {
>>>>>>> REPLACE
```

**Why**: Explicitly restricting FFmpeg threads prevents it from over-saturating CPU cores with context-switching overhead, leaving more resources available for Chromium's DOM rendering and Node's IPC.
**Risk**: If FFmpeg on `-threads 1` happens to be slower than the Chromium frame emission rate, the ring buffer might fill up causing backpressure. However, `ultrafast` is efficient enough that 1 thread should suffice.

## Variations
- If `-threads 1` creates too much backpressure, fall back to `-threads 2`.

## Canvas Smoke Test
Run canvas benchmarks to ensure FFmpeg encoding continues to work smoothly without errors.

## Correctness Check
Run the DOM benchmark and inspect `output.mp4` to verify visual correctness.

## Prior Art
- PERF-518 proved that maximizing Chromium concurrency (`os.cpus().length - 1`) works best. Limiting background consumers (FFmpeg) rather than producers (Chromium) is the logical next step.

## Results Summary
- **Best render time**: ~16.696s (vs baseline ~15.594s)
- **Improvement**: -7.0%
- **Kept experiments**: None
- **Discarded experiments**:
  - Limit FFmpeg threads to 1 (`-threads 1`)
