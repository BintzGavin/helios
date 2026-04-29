---
id: PERF-387
slug: inline-begin-frame-params
status: complete
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---

# PERF-387: Inline beginFrame parameter allocation in DomStrategy

## Focus Area
The `DomStrategy.ts` `capture()` method is the hot loop for capturing frames. Every frame, when `targetElementHandle` is not set, it calls `this.cdpSession!.send('HeadlessExperimental.beginFrame', { interval: this.frameInterval, frameTimeTicks: 10000 + frameTime })`. This creates a new anonymous object literal `{ interval: ..., frameTimeTicks: ... }` on every single frame. We should test if caching this object and modifying the `frameTimeTicks` property inline reduces garbage collection pressure.

## Background Research
In V8, creating object literals inside a hot loop forces the garbage collector to constantly clean up short-lived objects. While V8 is highly optimized for this, explicitly caching and mutating a single object in tight loops can sometimes provide a small performance gain by avoiding memory allocation and pointer churn. `CaptureLoop` processes frames asynchronously, but `DomStrategy` is invoked in an awaited fashion for each frame worker, meaning that within a single worker, the capture sequence is serial. We can safely maintain a worker-specific parameter object and mutate its `frameTimeTicks`.

Wait, the previous memory stated:
"PERF-327: Attempted to inline evaluateParams allocation in CdpTimeDriver.ts.
WHY it didn't work: Impossible due to async mutation race conditions. Playwright's CDP serialization is asynchronous. Mutating a shared object across multiple cdpSession.send calls (such as in a for loop for multiple iframes) can result in sending overwritten state. Allocating new inline objects for each command is strictly required to ensure correct CDP messaging."

However, in `DomStrategy.ts`, `HeadlessExperimental.beginFrame` is sent only ONCE per frame capture call (not in a loop across multiple iframes). Furthermore, the result of `capture` is awaited before the next frame is submitted to the same worker. Wait, `this.cdpSession!.send` is NOT awaited here:
```typescript
    const promise = new Promise<string>(this.screencastPromiseExecutor);

    this.cdpSession!.send('HeadlessExperimental.beginFrame', {
      interval: this.frameInterval,
      frameTimeTicks: 10000 + frameTime
    }).catch(() => {});

    const frameData = await promise;
```
Playwright's `send` is asynchronous. If we mutate the parameter object for the next frame before Playwright has serialized the current one, it might send the wrong `frameTimeTicks`. BUT, the worker `await promise` on `const frameData = await promise;` which waits for the `screencastFrame` event. Playwright CDP serialization is synchronous up to the Node.js IPC boundary. By the time `screencastFrame` arrives, the CDP command has long been serialized and sent. So mutating a shared object per worker should be safe here, unlike the `for` loop in `CdpTimeDriver` which fires multiple `send` calls concurrently without awaiting.

Let's test if explicitly allocating and mutating `beginFrameParams` provides a speedup over inline object literals.

## Benchmark Configuration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~31.5 seconds

## Implementation Spec

### Step 1: Preallocate `beginFrameParams`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Add a class property `private beginFrameParams: any = { interval: 0, frameTimeTicks: 0 };`.
In `prepare()`, initialize it: `this.beginFrameParams.interval = this.frameInterval;`.

### Step 2: Mutate instead of allocate in `capture`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `capture()`, instead of passing an inline object literal to `this.cdpSession!.send`, mutate `this.beginFrameParams.frameTimeTicks = 10000 + frameTime;` and pass `this.beginFrameParams`.
**Why**: Avoids dynamic object allocation on every frame, reducing V8 GC churn.
**Risk**: If Playwright's async CDP serialization reads the object later, it could read an overwritten value. However, the subsequent `await promise` ensures the frame pipeline is serialized, mitigating this risk.

## Variations
None.

## Canvas Smoke Test
N/A

## Correctness Check
Run targeted script `cd packages/renderer && npx tsx tests/verify-dom-strategy-capture.ts`.
