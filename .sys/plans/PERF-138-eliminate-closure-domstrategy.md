---
id: PERF-138
slug: eliminate-closure-domstrategy
status: unclaimed
claimed_by: ""
created: 2026-03-31
completed: ""
result: ""
---
# PERF-138: Eliminate Closure Allocation in DomStrategy.capture

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts`

## Background Research
In the `capture()` method of `DomStrategy.ts`, which runs once per frame in the hot loop, we currently allocate an anonymous closure to handle the `HeadlessExperimental.beginFrame` CDP response:

```typescript
      return this.cdpSession.send('HeadlessExperimental.beginFrame', this.beginFrameParams).then(({ screenshotData }: any) => {
        if (screenshotData) {
          const buffer = this.writeToBufferPool(screenshotData);
          this.lastFrameBuffer = buffer;
          return buffer;
        } else if (this.lastFrameBuffer) {
          return this.lastFrameBuffer;
        } else {
          this.lastFrameBuffer = this.emptyImageBuffer;
          return this.emptyImageBuffer;
        }
      });
```

Because `capture()` is called hundreds or thousands of times during a render, V8 must allocate a new function object and closure context for each frame, creating garbage collection pressure. Additionally, the same method dynamically calculates the `interval` (FPS) per frame, which is constant.

## Benchmark Configuration
- **Composition URL**: `output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5s (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 32.057s
- **Bottleneck analysis**: Micro-allocations in V8 GC causing stalls during the pipeline.

## Implementation Spec

### Step 1: Pre-bind the CDP response handler
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Add a private bound method `handleBeginFrameResult` to `DomStrategy` class:
```typescript
  private handleBeginFrameResult = ({ screenshotData }: any): Buffer => {
    if (screenshotData) {
      const buffer = this.writeToBufferPool(screenshotData);
      this.lastFrameBuffer = buffer;
      return buffer;
    } else if (this.lastFrameBuffer) {
      return this.lastFrameBuffer;
    } else {
      this.lastFrameBuffer = this.emptyImageBuffer;
      return this.emptyImageBuffer;
    }
  };
```
2. In `capture()`, replace `.then(({ screenshotData }: any) => { ... })` with `.then(this.handleBeginFrameResult)`.

**Why**: Reuses the exact same function reference across all frames, eliminating a closure allocation on the heap per frame.
**Risk**: Low. The `this` context is preserved because we use an arrow function property for `handleBeginFrameResult`.

### Step 2: Cache the `interval` calculation in `prepare()`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Remove `const interval = 1000 / (this as any).options.fps;` from `capture()`.
2. Move it to `prepare()` and initialize `beginFrameParams.interval` once.
3. Remove the redundant `interval` assignment from `capture()`.

**Why**: Eliminates a floating-point division operation per frame.
**Risk**: Low. `fps` is a constant parameter for the duration of the render.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` or specific strategy verification tests to ensure the interface still behaves correctly.
