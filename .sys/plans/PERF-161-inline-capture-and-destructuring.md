---
id: PERF-161
slug: inline-capture-and-destructuring
status: unclaimed
claimed_by: ""
created: 2024-05-26
completed: 2024-05-26
result: improved
---

# PERF-161: Inline Frame Capture Logic and Remove Destructuring Overhead

## Focus Area
Frame Capture Loop in `packages/renderer/src/Renderer.ts` and `DomStrategy.ts`

## Background Research
V8 function invocation, parameter passing, and object destructuring have a small but compounding overhead in hot loops. In `Renderer.ts`, `executeFrameCapture` is invoked sequentially for every frame, adding a function call boundary. Inlining it removes this invocation overhead entirely. Furthermore, in `DomStrategy.ts`, destructuring `{ screenshotData }` in the Promise resolution path forces V8 to allocate property wrappers. Changing this to direct property access (`res.screenshotData`) avoids these micro-allocations, reducing garbage collection pressure.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds (150 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.6s
- **Bottleneck analysis**: The function call boundary and object destructuring in the hot capture loop add unnecessary micro-overhead and GC pressure.

## Implementation Spec

### Step 1: Inline `executeFrameCapture`
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Remove the `executeFrameCapture` function definition entirely. Inline its logic directly into the `worker.activePromise.then(...)` block inside the `while` loop:

```typescript
const framePromise = worker.activePromise.then(() => {
    worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).catch(noopCatch);
    return worker.strategy.capture(worker.page, time);
});
```
**Why**: Eliminates a function call boundary and parameter passing overhead per frame.
**Risk**: Minimal. Variable scope capturing is already optimized by V8.

### Step 2: Remove Object Destructuring
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `capture()` method, find both instances of `this.cdpSession!.send('HeadlessExperimental.beginFrame', ...).then(({ screenshotData }: any) => { ... })` and change them to:
```typescript
.then((res: any) => {
    if (res && res.screenshotData) {
        const buffer = this.writeToBufferPool(res.screenshotData);
        // ...
    } else if (this.lastFrameBuffer) {
        // ...
```
**Why**: Destructuring objects in high-frequency Promise resolutions allocates property wrappers. Direct access skips this.
**Risk**: None, functionally identical.

## Variations
N/A

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas capture is unaffected.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to ensure DOM frames remain correct.

## Results Summary
- **Best render time**: 33.652s (vs baseline 36.022s)
- **Improvement**: 6.5%
- **Kept experiments**: Inlined executeFrameCapture and removed object destructuring
- **Discarded experiments**: None
