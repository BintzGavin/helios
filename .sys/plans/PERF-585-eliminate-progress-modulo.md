---
id: PERF-585
slug: eliminate-progress-modulo
status: unclaimed
claimed_by: ""
created: 2026-10-31
completed: ""
result: ""
---

# PERF-585: Eliminate Progress Modulo in Capture Hot Loop

## Focus Area
DOM Rendering Pipeline - Hot loop in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
In the `CaptureLoop.ts` orchestrator, the `run` method submits frames to FFmpeg. Inside the frame writer loop, progress logging relies on an integer modulo and division operation for every single frame:
```typescript
            const currentFrame = nextFrameToWrite;

            if (currentFrame > 0 && currentFrame % progressInterval === 0) {
                console.log(`Progress: Rendered ${currentFrame} / ${this.totalFrames} frames`);
            }

            if (onProgress) {
                onProgress(currentFrame / this.totalFrames);
            }
```
While modern JS engines optimize modulo operations, executing it inside a tight I/O backpressure loop (where thousands of frames are piped to FFmpeg) introduces unnecessary CPU instructions and possible deoptimizations. We can track the next progress target explicitly via addition to bypass the modulo operator.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: 600x600, 30fps, 5s duration, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Micro-optimizations in the writer waiter loop of `CaptureLoop.ts`. V8 modulo operations and floating-point divisions inside the generator state machine.

## Implementation Spec

### Step 1: Optimize Progress Tracking
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Above the `workerPromises` definition, initialize a new tracker variable:
```typescript
let nextProgressFrame = progressInterval;
```
Inside the `try { while (nextFrameToWrite < this.totalFrames && !aborted) { ... } }` loop, replace the progress modulo check:
```typescript
            const currentFrame = nextFrameToWrite;

            if (currentFrame === nextProgressFrame) {
                console.log(`Progress: Rendered ${currentFrame} / ${this.totalFrames} frames`);
                nextProgressFrame += progressInterval;
            }

            if (onProgress) {
                onProgress(currentFrame / this.totalFrames);
            }
```
**Why**: Tracking the next progress target via equality and addition eliminates the modulo computation, slightly reducing CPU overhead in the frame routing hot loop.

## Correctness Check
Run the renderer benchmark to ensure frames are successfully generated, video is successfully output, and progress is still logged to the console appropriately at 10% intervals.

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- --run` to ensure changes don't break standard compilation and rendering loops.
