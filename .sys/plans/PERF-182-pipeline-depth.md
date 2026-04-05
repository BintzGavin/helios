---
id: PERF-182
slug: pipeline-depth
status: complete
claimed_by: "executor-session"
created: 2026-04-05
completed: 2026-04-05
result: failed
---

# PERF-182: Increase Pipeline Depth to Improve Frame Capture Throughput

## Focus Area
The `captureLoop` in `packages/renderer/src/Renderer.ts` dictates the degree of concurrency we allow between the DOM capture step and the FFmpeg writing step. The current implementation configures `maxPipelineDepth = poolLen * 2`.

## Background Research
Currently, `maxPipelineDepth` is restricted to `poolLen * 2`. Since the microVM environments (and generic Docker images) often utilize parallel processing capabilities (and the CPU-bound task of base64 decoding and IPC parsing may overlap with FFmpeg software encoding), limiting the pre-fetched / concurrently pending frames to exactly 2x the pool size might be overly restrictive.
By increasing the pipeline depth, we can buffer more captured frames in memory (which is cheap compared to waiting on the browser IPC roundtrip) and thus ensure the FFmpeg `stdin` pipe never starves while waiting for `cdpSession.send` to resolve. Testing a larger multiple (e.g., `poolLen * 4` or `poolLen * 8`) should keep the encoding pipeline saturated without exhausting the microVM's heap.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30 FPS, duration 5s, mode: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~3.8s
- **Bottleneck analysis**: IPC latency between Node.js and Chromium leading to FFmpeg stdin starvation.

## Implementation Spec

### Step 1: Increase `maxPipelineDepth`
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Change the calculation of `maxPipelineDepth` from:
```typescript
const maxPipelineDepth = poolLen * 2;
```
to:
```typescript
const maxPipelineDepth = poolLen * 8;
```
**Why**: By increasing the number of concurrently requested/buffered frames, we better decouple the asynchronous nature of Playwright/Chromium CDP frame generation from the synchronous FFmpeg input writing loop.
**Risk**: Potential increase in Node.js memory footprint if `totalFrames` is massive, but for standard configurations (150 frames over 5s) memory should stay well within limits.

## Correctness Check
Run the `benchmark.ts` to ensure rendering still completes successfully with the correct number of frames without crashing or throwing an out-of-memory error.

## Canvas Smoke Test
No changes are being made to canvas-specific APIs, but we will ensure standard imports and logic compiles correctly by running `npm run test -w packages/renderer`.
## Results Summary
- **Best render time**: 0.000s (vs baseline 3.800s)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [PERF-182-pipeline-depth]
