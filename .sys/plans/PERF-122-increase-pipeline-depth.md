---
id: PERF-122
slug: increase-pipeline-depth
status: complete
claimed_by: "executor-session"
created: 2025-02-18
completed: "2025-02-18"
result: "no-improvement"
---
# PERF-122: Optimize Render Concurrency by Increasing Max Pipeline Depth

## Focus Area
The hot frame capture loop in `packages/renderer/src/Renderer.ts`.

## Background Research
Currently, the renderer initializes a pool of multiple Playwright pages based on CPU concurrency (max 8). In `PERF-121`, we successfully decoupled `BrowserContexts` per worker to prevent OS thread contention, reducing render time to ~34.1s. In `PERF-119`, we gave each worker page an independent `RenderStrategy` instance, resolving `Another frame is pending` errors. We also provided an independent `evaluateParamsPool` inside `SeekTimeDriver` to fix IPC race conditions during multi-worker scaling.

Now that the workers are truly independent, and memory leak/crash issues associated with deep pipelining have been solved via dynamic buffer allocation (`Buffer.allocUnsafe` from `PERF-107`), we can push more frames concurrently into the Chromium CDP queue.

Right now, the `Renderer.ts` restricts the active pipeline depth:
`const poolLen = pool.length;`
`const maxPipelineDepth = poolLen * 2;`
Given we have ~4-8 workers, a `maxPipelineDepth` of `poolLen * 2` means only 8-16 frames are in-flight across all workers at any given time. This under-utilizes the asynchronous nature of CDP and Chromium's parallel layout/paint capabilities across multiple processes. By increasing this to `poolLen * 8`, we can queue more evaluations concurrently, improving the overall throughput and better saturating the FFmpeg encoding pipe without running into the previous `Another frame is pending` crashes, because each worker operates on its own dedicated `BrowserContext`, `DomStrategy`, and `CDPSession`.

## Baseline
- **Current estimated render time**: ~34.112s
- **Bottleneck analysis**: The pipeline depth is artificially constrained, resulting in workers waiting for FFmpeg stream processing or network/IPC round trips instead of overlapping frame capture work.

## Implementation Spec

### Step 1: Increase `maxPipelineDepth` constraint in `Renderer.ts`
**File**: `packages/renderer/src/Renderer.ts`
**What to change**: Change `const maxPipelineDepth = poolLen * 2;` to `const maxPipelineDepth = poolLen * 8;` inside the `captureLoop` in `Renderer.ts`.
**Why**: This significantly increases the number of asynchronous frames queued up across all parallel workers, taking full advantage of the decoupled browser contexts and independent CDP sessions established in previous optimizations.
**Risk**: Potential increase in memory pressure due to more queued Buffer allocations, but since they are dynamic and cleared immediately upon writing to FFmpeg, V8 GC should handle it fine.

## Correctness Check
Verify that the output video correctly aligns frames without dropping content.

## Results Summary
- **Best render time**: 33.633s (vs baseline 45.617s - noisy environment, subsequent baseline is ~33.6s)
- **Improvement**: ~0% (Noise)
- **Kept experiments**: []
- **Discarded experiments**: [Increase maxPipelineDepth to poolLen * 8]
