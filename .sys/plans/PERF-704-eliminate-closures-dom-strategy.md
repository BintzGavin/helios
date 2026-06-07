---
id: PERF-704
slug: eliminate-closures-dom-strategy
status: complete
claimed_by: "executor-session"
created: 2024-06-08
completed: ""
result: ""
---

# PERF-704: Eliminate Per-Frame Closures in DomStrategy Capture

## Focus Area
The `DomStrategy.capture()` method, which executes on every frame in the `CaptureLoop` hot path. This experiment aims to eliminate all inline anonymous closure allocations during the CDP capture phase to reduce GC pressure and microtask overhead.

## Background Research
In JavaScript hot loops, allocating anonymous closures (e.g., `(result) => ...` inside a `.then()`) forces V8 to allocate memory and manage scopes on every iteration. While V8 is heavily optimized for this, pre-bound closures (class properties) provide a static reference that allows the JIT compiler to maintain a consistent hidden class shape without per-frame allocation.
Additionally, the current `capture()` method uses a `.catch()` block as a fallback mechanism to return `lastFrameData`. This allocates a second closure and a second Promise object per frame. Masking CDP failures (like a crashed compositor) with stale frames is an anti-pattern; if `beginFrame` fails, we should let the unhandled rejection abort the render.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000` (or standard DOM benchmark)
- **Render Settings**: 150 frames, 30fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.166s (best from PERF-701)
- **Bottleneck analysis**: The Playwright CDP `send('HeadlessExperimental.beginFrame')` promise chain allocates inline closures and multiple Promises per frame, increasing GC pressure and V8 state machine overhead.

## Implementation Spec

### Step 1: Pre-bind the `.then()` callback and remove `.catch()`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Define a new pre-bound class property:
   ```typescript
   private handleBeginFrameResult = (result: any): string | Buffer => {
     return (this.lastFrameData = result.screenshotData || this.lastFrameData)!;
   };
   ```
2. Update the `capture()` method to use the pre-bound property and remove the `.catch()` block:
   ```typescript
   capture(page: Page, frameTime: number): Promise<Buffer | string> {
     return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams)
       .then(this.handleBeginFrameResult);
   }
   ```
**Why**: This reduces the per-frame allocation in the inner loop from two anonymous closures and two chained Promises down to zero closures and one single Promise resolution via a static method reference.
**Risk**: If `beginFrame` encounters benign, transient errors, removing `.catch()` will cause the renderer to crash instead of freezing on the last frame. However, CDP errors are typically fatal (e.g., Target closed), so failing fast is the correct behavior.

## Variations
None.

## Canvas Smoke Test
This only impacts DOM mode.

## Correctness Check
Verify that the output `dom-benchmark.mp4` video accurately renders the composition without dropped frames. Ensure that if Chromium crashes, the process properly aborts rather than hanging or returning black frames.

## Prior Art
- **PERF-701**: Simplified the closure body inside `.then()` and `.catch()`, improving performance.
- **PERF-680**: Proved that inline promise executors can regress performance compared to statically allocated pre-bound properties, highlighting V8's preference for stable references in hot loops.

## Results Summary
- **Best render time**: 2.327s
- **Kept experiments**: PERF-704
