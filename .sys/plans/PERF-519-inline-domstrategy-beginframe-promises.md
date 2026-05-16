---
id: PERF-519
slug: inline-domstrategy-beginframe-promises
status: unclaimed
claimed_by: ""
created: 2024-05-16
completed: ""
result: ""
---

# PERF-519: Inline Promise handling in DomStrategy beginFrame

## Focus Area
`DomStrategy.ts` -> `capture` method. The `cdpSession!.send('HeadlessExperimental.beginFrame', ...)` promise is currently chained with `.then(this.handleBeginFrameSuccess, this.handleBeginFrameError)`. This happens in the hot loop, executed thousands of times per render. Inlining these callbacks directly into an `await` followed by a `try-catch` block could remove the allocation of a secondary Promise wrapper for each frame, reducing V8 Promise overhead.

## Background Research
Every `.then()` and `.catch()` on a Promise in JavaScript allocates a new Promise object to support further chaining. In a tight loop executing hundreds or thousands of times, avoiding these extra wrapper Promises can marginally reduce GC pressure and overhead. By utilizing `try-catch` with `await`, V8 often optimizes the control flow without creating observable userland Promise chain allocations, potentially speeding up execution at the micro-level.

## Benchmark Configuration
- **Composition URL**: (Standard benchmark URL used by executor)
- **Render Settings**: 600 frames, mode dom
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~17.687s
- **Bottleneck analysis**: The Playwright/CDP roundtrip combined with the intermediate Node.js promise chains overhead in the hot loop.

## Implementation Spec

### Step 1: Inline `handleBeginFrameSuccess` and `handleBeginFrameError`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Replace the `.then(...)` syntax in the `capture` method with standard `try { await ... } catch { ... }`.

1. Remove `handleBeginFrameSuccess` and `handleBeginFrameError` class methods.
2. Update the `capture` method to explicitly `await` the CDP result:
   ```typescript
   async capture(page: Page, frameTime: number): Promise<Buffer | string> {
     if (this.targetElementHandle) {
       const box = await this.targetElementHandle.boundingBox();
       if (!box) {
          return this.lastFrameData!;
       }

       this.targetBeginFrameParams.screenshot.clip.x = box.x;
       this.targetBeginFrameParams.screenshot.clip.y = box.y;
       this.targetBeginFrameParams.screenshot.clip.width = box.width;
       this.targetBeginFrameParams.screenshot.clip.height = box.height;
       this.targetBeginFrameParams.frameTimeTicks = 10000 + frameTime;

       try {
         const result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams);
         const frameData = result.screenshotData || this.lastFrameData!;
         this.lastFrameData = frameData;
         return frameData;
       } catch (e) {
         return this.lastFrameData!;
       }
     }

     this.beginFrameParams.frameTimeTicks = 10000 + frameTime;

     try {
       const result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
       const frameData = result.screenshotData || this.lastFrameData!;
       this.lastFrameData = frameData;
       return frameData;
     } catch (e) {
       return this.lastFrameData!;
     }
   }
   ```
**Why**: Avoids creating additional intermediate Promise objects in the V8 heap on every frame.
**Risk**: Error handling logic must be exactly equivalent to `.catch()` to prevent breaking frame fallbacks.

## Correctness Check
The DOM output should still render all frames correctly.

## Canvas Smoke Test
N/A (DOM strategy only)
