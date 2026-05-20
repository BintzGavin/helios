---
id: PERF-556
slug: bypass-capture-await
status: unclaimed
claimed_by: ""
created: 2024-06-03
completed: ""
result: ""
---

# PERF-556: Bypass Await in DomStrategy Capture

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` - the hot loop `capture` method.

## Background Research
Currently, inside the `capture` method of `DomStrategy.ts`, the CDP command `HeadlessExperimental.beginFrame` is awaited:

```typescript
    try {
      const result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
      const frameData = result.screenshotData || this.lastFrameData!;
      this.lastFrameData = frameData;
      return frameData;
    } catch (e) {
      return this.lastFrameData!;
    }
```

Awaiting `this.cdpSession!.send(...)` forces the V8 execution context to yield and resume. While PERF-544 tried to replace `try...catch` with an `await .catch()` and caused a regression due to promise chain microtask scheduling overhead, returning a Promise directly (as was tested in PERF-432 but on a previous baseline) allows the caller (`CaptureLoop.ts`) to await the result natively, bypassing the intermediate async suspension point in `DomStrategy.ts`.
By rewriting the logic to return the Promise directly and process the result using `.then()`, we avoid the `async` state machine overhead within the `capture` function's execution context. To avoid closure allocation in `.then()`, we prebind the success and error handlers.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10s duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~10.002s
- **Bottleneck analysis**: The `async/await` wrapper around the CDP IPC round-trip for every single frame adds minor GC and event loop scheduling overhead.

## Implementation Spec

### Step 1: Prebind Handlers and Remove Await
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Define the handlers as bound class methods to avoid per-frame dynamic closure allocations, and return the promise directly in the `capture` method for the non-target code path.

```typescript
<<<<<<< SEARCH
  async capture(page: Page, frameTime: number): Promise<Buffer | string> {
    if (this.targetElementHandle) {
=======
  private handleBeginFrameSuccess = (result: any) => {
    const frameData = result.screenshotData || this.lastFrameData!;
    this.lastFrameData = frameData;
    return frameData;
  };

  private handleBeginFrameError = () => {
    return this.lastFrameData!;
  };

  async capture(page: Page, frameTime: number): Promise<Buffer | string> {
    if (this.targetElementHandle) {
>>>>>>> REPLACE
```

Then, replace the `try...catch` block:
```typescript
<<<<<<< SEARCH
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
=======
    this.beginFrameParams.frameTimeTicks = 10000 + frameTime;

    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams)
      .then(this.handleBeginFrameSuccess, this.handleBeginFrameError);
  }
>>>>>>> REPLACE
```

**Why**: Returning the promise chain directly skips the implicit `Promise` creation and resolution sequence that `async/await` introduces internally. Using prebound handlers with `.then(success, error)` avoids dynamic closure allocations.
**Risk**: If V8's native `async/await` optimization is faster than manual Promise `.then` chaining, this might regress performance.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- --run` to ensure Canvas strategy tests pass.

## Correctness Check
Run the DOM render verification tests (`npm run test -w packages/renderer -- --run`) to verify that replacing the await does not break the renderer.

## Prior Art
- PERF-432 previously attempted this on a much older baseline and yielded a 3.7% improvement. Re-testing on the highly-optimized single-process baseline is warranted.
- PERF-544 attempted to replace `try...catch` with `await .catch()` and caused a regression, confirming that microtask allocation on top of `await` is slow, but returning the `.then()` chain directly bypasses the `await`.
