---
id: PERF-172
slug: eliminate-closure-allocation-hot-loop
status: unclaimed
claimed_by: ""
created: 2026-10-18
completed: ""
result: ""
---

# PERF-172: Eliminate Closure Allocation in DomStrategy.capture()

## Focus Area
The `DomStrategy.ts` `capture()` method is the hottest path in the entire DOM rendering pipeline. It currently allocates a new inline function closure for every frame using `.then(({ screenshotData }: any) => { ... })`.

## Background Research
In previous performance explorations, an attempt was made to extract this closure into a pre-bound class property. However, that attempt failed with a crash because it tried to destructure `{ screenshotData }` directly in the property argument definition, which caused undefined buffers when Playwright's fallback mechanism was invoked or structural unpacking failed. V8 engines must allocate a new context for every anonymous arrow function passed into `.then()` inside loops, increasing Garbage Collection (GC) pressure.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30 FPS, 5 seconds (150 frames), DOM Mode
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.7s
- **Bottleneck analysis**: The micro-allocations in the hot loop cause minor V8 GC pauses that delay the sequential queueing of Playwright CDP operations.

## Implementation Spec

### Step 1: Pre-bind the Result Handlers
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Add two new class properties to `DomStrategy` before the `capture()` method:
```typescript
  private handleBeginFrameResult = (result: any) => {
    if (result.screenshotData) {
      const buffer = this.writeToBufferPool(result.screenshotData);
      this.lastFrameBuffer = buffer;
      return buffer;
    } else if (this.lastFrameBuffer) {
      return this.lastFrameBuffer;
    } else {
      this.lastFrameBuffer = this.emptyImageBuffer;
      return this.emptyImageBuffer;
    }
  };

  private handleFallbackResult = (fallback: any) => {
    this.lastFrameBuffer = fallback;
    return fallback as Buffer;
  };
```
**Why**: Defining them as arrow function properties ensures they are bound to the `DomStrategy` instance `this` context exactly once during class instantiation, rather than re-allocating a closure per frame. Notice we don't destructure `result: any` in the parameter signature, avoiding unpacking crashes.

### Step 2: Replace inline closures in capture()
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Inside `capture()`, replace every `.then(({ screenshotData }: any) => { ... })` inline closure with `.then(this.handleBeginFrameResult)`.
Replace every `.then((fallback: any) => { ... })` inline closure with `.then(this.handleFallbackResult)`.
**Why**: This directly passes the pre-allocated reference to V8's promise chain.
**Risk**: If `this` binding is lost (unlikely with arrow properties), it will crash. If the Playwright result object structure changes, it could cause undefined errors.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure we didn't break the fallback rendering paths.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts`.

## Prior Art
- PERF-138 (Failed due to destructuring bugs)
- PERF-159 / PERF-160 (Successfully eliminated closures in Renderer.ts)
