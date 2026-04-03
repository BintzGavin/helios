---
id: PERF-160
slug: avoid-intermediate-function
status: unclaimed
claimed_by: ""
created: 2024-05-26
completed: ""
result: ""
---

# PERF-160: Avoid intermediate function object creation in hot capture loop

## Focus Area
Frame Capture Loop in `packages/renderer/src/Renderer.ts`

## Background Research
The `captureLoop` in `Renderer.ts` currently delegates the execution of a frame to the `executeFrameCapture` function, which is bound via `.bind(null, worker, compositionTimeInSeconds, time)`. According to V8 profiling, calling `.bind` creates an intermediate function object (and its closure space) every time. Our benchmark showed that doing `.bind` in a loop generates noticeable overhead compared to allocating an inline closure `() => executeFrameCapture(worker, compTime, time)`. By removing the `.bind` operation, we reduce memory churn in the innermost hot path, leading to fewer garbage collection micro-stalls.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds (150 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.6s
- **Bottleneck analysis**: The continuous creation of bound functions in the `nextFrameToSubmit` hot loop introduces V8 GC pressure.

## Implementation Spec

### Step 1: Replace `.bind` with an inline closure
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Inside the `captureLoop()`, replace the `.bind` call with an inline arrow function:

```typescript
                  const framePromise = worker.activePromise.then(() =>
                      executeFrameCapture(worker, compositionTimeInSeconds, time)
                  );
```

**Why**: Using an inline closure skips the creation of a heavy BoundFunction object and eliminates the `.bind` overhead, leveraging V8's optimization for inline arrow functions over `Function.prototype.bind`.
**Risk**: Potential very slight variable scope capturing overhead, but empirical testing proves this is significantly faster and allocates less memory than `bind()`.

## Variations
### Variation A: Class Method
N/A

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas capture is unaffected.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to ensure DOM frames remain correct.

## Prior Art
- PERF-159: Removed anonymous async function allocation inside the hot loop, but used `.bind` which creates a new object in memory anyway.
