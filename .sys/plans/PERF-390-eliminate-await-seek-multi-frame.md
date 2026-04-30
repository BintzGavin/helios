---
id: PERF-390
slug: eliminate-await-seek-multi-frame
status: unclaimed
claimed_by: ""
created: 2024-04-30
completed: ""
result: ""
---
# PERF-390: Eliminate await on Promise.all in SeekTimeDriver's setTime multi-frame path

## Focus Area
The multi-frame hot path in `SeekTimeDriver.setTime()` inside the `CaptureLoop.ts` hot loop.

## Background Research
Currently, `SeekTimeDriver.setTime()` in the multi-frame path returns `Promise.all(promises) as unknown as Promise<void>`. The `Promise.all` allocation is necessary to wait for multiple async evaluation frames to complete, as seen in PERF-312. But we can eliminate the `Promise.all` allocation and just return `promises` if we handle it at the `CaptureLoop` caller level. However, `CaptureLoop` expects a single `Promise<void>`. Wait, what if we eliminate the array allocation altogether?

In PERF-312, they tried to avoid `Promise.all(promises)` allocation and return `Promise.resolve()`, which broke synchronization. But wait, in the single-frame path, we just return the raw CDP promise:
```typescript
      return this.cdpSession!.send('Runtime.evaluate', {
        expression: 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')',
        awaitPromise: true
      }) as unknown as Promise<void>;
```
In the multi-frame path:
```typescript
    for (let i = 0; i < this.executionContextIds.length; i++) {
      promises.push(this.cdpSession!.send('Runtime.evaluate', {
        expression,
        contextId: this.executionContextIds[i],
        awaitPromise: true
      }));
    }
    return Promise.all(promises) as unknown as Promise<void>;
```
Wait, if we use a pre-allocated array of promises, we can reuse it to avoid array reallocation, but `Promise.all` takes an iterable.
Actually, let's look at `CdpTimeDriver`. Does it have a similar path? Yes, but `await` was removed for media sync (PERF-375). For seek, we MUST await to ensure DOM is ready.

Let's look at `SeekTimeDriver`.
What if we pre-allocate the `promises` array instead of dynamically creating it?
```typescript
    // class property
    private multiFramePromises: Promise<any>[] = [];

    // in setTime
    for (let i = 0; i < this.executionContextIds.length; i++) {
      this.multiFramePromises[i] = this.cdpSession!.send('Runtime.evaluate', {
        expression,
        contextId: this.executionContextIds[i],
        awaitPromise: true
      });
    }
    return Promise.all(this.multiFramePromises) as unknown as Promise<void>;
```
This avoids allocating a new `[]` array on every frame.

## Benchmark Configuration
- **Composition URL**: `scripts/benchmark-concurrent.ts` or similar DOM test.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Implementation Spec

### Step 1: Pre-allocate Promises Array
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Add `private multiFramePromises: Promise<any>[] = [];` to `SeekTimeDriver`.
2. In `setTime`, replace `const promises = [];` with resetting length: `this.multiFramePromises.length = this.executionContextIds.length;`
3. Update the loop to assign to `this.multiFramePromises[i]`.
4. Return `Promise.all(this.multiFramePromises) as unknown as Promise<void>`.
**Why**: Avoids dynamically allocating a new Array on every single frame in the hot loop when multiple frames/iframes are present.
**Risk**: Minor, length management.

## Variations
### Variation A: Fixed size array
If `executionContextIds.length` is constant after initialization, we can just pre-fill it and avoid length changes.

## Correctness Check
Run `tests/verify-dom-media-preload.ts` and `tests/verify-seek-driver-stability.ts`.
