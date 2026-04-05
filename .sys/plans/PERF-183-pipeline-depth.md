---
id: PERF-183
slug: pipeline-depth
status: complete
claimed_by: "executor-session"
created: 2026-04-05
completed: 2026-04-05
result: failed
---

# PERF-183: Decrease Pipeline Depth to Improve Frame Capture Stability

## Focus Area
The `captureLoop` in `packages/renderer/src/Renderer.ts` dictates the degree of concurrency we allow between the DOM capture step and the FFmpeg writing step. The current implementation configures `maxPipelineDepth = poolLen * 2`.

## Background Research
Currently, `maxPipelineDepth` is restricted to `poolLen * 2`. Since the microVM environments (and generic Docker images) often utilize parallel processing capabilities (and the CPU-bound task of base64 decoding and IPC parsing may overlap with FFmpeg software encoding), we previously tested if increasing it to `poolLen * 8` would be faster. However, it seems the `maxPipelineDepth` is bottlenecked. Increasing the pipeline depth caused tests to timeout, memory leaks, and memory bloats.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30 FPS, duration 5s, mode: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~3.8s
- **Bottleneck analysis**: IPC latency between Node.js and Chromium leading to FFmpeg stdin starvation.

## Implementation Spec

### Step 1: Decrease `maxPipelineDepth`
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Change the calculation of `maxPipelineDepth` from:
```typescript
const maxPipelineDepth = poolLen * 2;
```
to:
```typescript
const maxPipelineDepth = poolLen * 1;
```
**Why**: By decreasing the number of concurrently requested/buffered frames, we better couple the asynchronous nature of Playwright/Chromium CDP frame generation from the synchronous FFmpeg input writing loop.
**Risk**: Potential decrease in Node.js performance if `totalFrames` is massive, but for standard configurations (150 frames over 5s) performance should stay well within limits.

## Correctness Check
Run the `benchmark.ts` to ensure rendering still completes successfully with the correct number of frames without crashing or throwing an out-of-memory error.

## Canvas Smoke Test
No changes are being made to canvas-specific APIs, but we will ensure standard imports and logic compiles correctly by running `npm run test -w packages/renderer`.
## Results Summary
- **Best render time**: 0.000s (vs baseline 3.800s)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [PERF-183-pipeline-depth]
