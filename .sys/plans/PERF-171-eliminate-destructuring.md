---
id: PERF-171
slug: eliminate-destructuring
status: claimed
claimed_by: "executor-session"
created: 2024-05-26
completed: "2024-05-26"
result: "failed"
---

# PERF-171: Eliminate Object Destructuring Micro-Allocations in Promise Continuation

## Focus Area
DOM Rendering Pipeline - Hot Loop (`capture` method in `DomStrategy.ts`).

## Background Research
In V8, object destructuring in function parameters (like `.then(({ screenshotData }: any) => { ... })`) is not free. It forces the engine to allocate an internal property wrapper/closure mapping on every execution, adding garbage collection (GC) pressure inside highly sensitive hot loops.
Currently, `DomStrategy.ts` uses `{ screenshotData }: any` destructuring for every frame processed through `HeadlessExperimental.beginFrame` and `this.targetElementHandle.boundingBox()`.

Previously in PERF-161, we attempted to inline both `executeFrameCapture` and remove destructuring overhead simultaneously. That experiment resulted in no meaningful improvement (and a discarded baseline of ~47s). However, compounding micro-optimizations often fail when conflated with broader architectural changes. Given that we have recently optimized `activePromise .catch` allocations and reduced GC stalls (PERF-168), reducing remaining property allocations in the pure Promise continuation path is the highest-leverage micro-optimization left in the capture loop. We will isolate the destructuring removal and apply it to both the bounding box check and `beginFrame` calls.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~36.022s
- **Bottleneck analysis**: The V8 hot capture loop in `DomStrategy.ts` contains unnecessary destructuring assignments during promise resolution `({ screenshotData }: any)`, causing micro-allocations per frame.

## Implementation Spec

### Step 1: Remove Destructuring in `DomStrategy.capture`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `capture()` method, find both instances of `this.cdpSession!.send('HeadlessExperimental.beginFrame', ...).then(({ screenshotData }: any) => { ... })` and change them to use direct property access.

Change 1:
```typescript
<<<<<<< SEARCH
            return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameTargetParams).then(({ screenshotData }: any) => {
              if (screenshotData) {
                const buffer = this.writeToBufferPool(screenshotData);
                this.lastFrameBuffer = buffer;
                return buffer;
              } else if (this.lastFrameBuffer) {
                return this.lastFrameBuffer;
              } else {
=======
            return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameTargetParams).then((res: any) => {
              if (res && res.screenshotData) {
                const buffer = this.writeToBufferPool(res.screenshotData);
                this.lastFrameBuffer = buffer;
                return buffer;
              } else if (this.lastFrameBuffer) {
                return this.lastFrameBuffer;
              } else {
>>>>>>> REPLACE
```

Change 2:
```typescript
<<<<<<< SEARCH
      return this.cdpSession.send('HeadlessExperimental.beginFrame', this.beginFrameParams).then(({ screenshotData }: any) => {
        if (screenshotData) {
          const buffer = this.writeToBufferPool(screenshotData);
          this.lastFrameBuffer = buffer;
          return buffer;
        } else if (this.lastFrameBuffer) {
=======
      return this.cdpSession.send('HeadlessExperimental.beginFrame', this.beginFrameParams).then((res: any) => {
        if (res && res.screenshotData) {
          const buffer = this.writeToBufferPool(res.screenshotData);
          this.lastFrameBuffer = buffer;
          return buffer;
        } else if (this.lastFrameBuffer) {
>>>>>>> REPLACE
```

**Why**: Destructuring objects in high-frequency Promise resolutions allocates property wrappers and increases GC pressure. Direct access bypasses this.
**Risk**: None, functionally identical.

## Variations
N/A

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to verify DOM frame generation still functions properly across configurations.
Run `npm run test -w packages/renderer` to ensure baseline functionality remains green.

## Results Summary
- **Best render time**: 33.451s (vs baseline 33.390s)
- **Improvement**: -0.18% (worse)
- **Kept experiments**: []
- **Discarded experiments**: [Eliminate Object Destructuring in DomStrategy]
