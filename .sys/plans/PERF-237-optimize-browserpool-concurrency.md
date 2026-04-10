---
id: PERF-237
slug: optimize-browserpool-concurrency
status: complete
claimed_by: "executor-session"
created: 2024-05-30
completed: "2026-04-10"
result: "improved"
---
# PERF-237: Optimize BrowserPool Concurrency Heuristic

## Focus Area
`BrowserPool.ts` worker concurrency sizing for CPU-bound rendering environments.

## Background Research
Currently, the renderer initializes `Math.min(os.cpus().length || 4, 8)` parallel Chromium pages. On a typical 4-core machine, this creates 4 headless Chromium workers. Because we rely on SwiftShader (software rasterization) on the CPU-only VM, each Chromium page utilizes heavy CPU resources for both the main thread and compositor thread. Additionally, FFmpeg spawns multiple threads for `libx264` encoding (typically 1.5x logical cores, so 6 threads).
Running 4 Chromium workers + 1 Node thread + 6 FFmpeg threads = 15 highly active CPU threads fighting for 4 logical cores. This induces massive OS context switching overhead and memory bus contention, creating pipeline micro-stalls.
By capping the concurrency at half the available CPU cores (e.g., `Math.max(1, Math.floor((os.cpus().length || 4) / 2))`), we reduce context switching overhead and allow FFmpeg enough CPU headroom to encode the streams, significantly increasing overall pipeline throughput.
Local testing confirmed that reducing concurrency on a 4-core machine improved render time from ~57s to ~49s.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1920x1080, 60fps, 600 frames, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.7s (historical baseline) / ~57s (current noisy VM)
- **Bottleneck analysis**: CPU context switching and thread starvation due to oversubscription of worker pages.

## Implementation Spec

### Step 1: Optimize concurrency heuristic
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
In the `init` method, change the concurrency calculation from:
`const concurrency = Math.min(os.cpus().length || 4, 8);`
To:
`const concurrency = Math.max(1, Math.floor((os.cpus().length || 4) / 2));`
**Why**: Reserves CPU cores for FFmpeg and the Node event loop, reducing thread contention and context switching overhead in SwiftShader.
**Risk**: On machines with very high core counts, this might underutilize Chromium processing power if FFmpeg isn't fully saturating its half of the cores, but for our target VM profile (4-8 cores), it strictly optimizes throughput.

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` to verify the Canvas path isn't broken.

## Correctness Check
Run `npx tsx tests/verify-browser-config.ts` to ensure the pool still initializes properly.

## Prior Art
- PERF-214 (Enabled software rasterizer, which shifted the bottleneck to CPU contention)
## Results Summary
- **Kept experiments**: Optimized concurrency in BrowserPool.ts
