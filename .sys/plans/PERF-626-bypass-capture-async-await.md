---
id: PERF-626
slug: bypass-capture-async-await
status: complete
claimed_by: "executor-session"
created: 2024-05-30
completed: "2024-05-30"
result: "no-improvement"
---

# PERF-626: Bypass `async/await` in DomStrategy capture

## Focus Area
DOM Rendering Pipeline - Hot loop in `packages/renderer/src/strategies/DomStrategy.ts`.

## Background Research
In PERF-625, we successfully cached the `boundingBox` call in `prepare()`, which removed the asynchronous Playwright IPC overhead from the `capture` hot loop. However, the `capture` method still uses `async/await` and an inline `try/catch` block for `this.cdpSession!.send`.

Previous experiments (like PERF-623) attempted to remove `async/await` from `capture()`, but they failed severely because they manually chained `.then()` handlers with anonymous closures (e.g., `result => { ... }`). The V8 engine has highly optimized fast-paths for inline `try/catch` and `async/await` around promises, making manual Promise chaining comparatively slower when closures are involved.

However, if we pre-bind the success and error handlers as class methods, we can avoid creating new closures on every frame. We can then return the Promise chain directly from `capture()`, eliminating the V8 generator state machine overhead associated with `async/await`.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: 1920x1080, 60fps, 5s duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.46s (baseline)
- **Bottleneck analysis**: The `capture` hot loop currently uses `async/await`, which introduces V8 microtask ticks and generator allocation overhead.

## Implementation Spec

### Step 1: Pre-bind handlers and remove `async/await`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Add pre-bound success and error handler methods to `DomStrategy`.
2. Modify `capture()` to return the CDP Promise directly, chained with the pre-bound handlers.
3. Remove the `async` keyword from `capture()`.

```typescript
  private handleCaptureSuccess = (result: any): Buffer | string => {
    if (result.screenshotData) {
      this.lastFrameData = result.screenshotData;
    }
    return this.lastFrameData!;
  };

  private handleCaptureError = (e: any): Buffer | string => {
    return this.lastFrameData!;
  };

  capture(page: Page, frameTime: number): Promise<Buffer | string> {
    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.activeBeginFrameParams)
      .then(this.handleCaptureSuccess, this.handleCaptureError);
  }
```

**Why**: By returning the Promise directly and using pre-bound handlers, we eliminate the V8 generator state machine allocation (`async/await`) and avoid closure allocations in the `.then()` chain.

## Correctness Check
Run the `npx tsx packages/renderer/scripts/benchmark-perf.ts` script to test performance and verify correct output. Ensure the video renders successfully and doesn't crash.

## Results Summary
- **Best render time**: 2.221s (vs baseline 2.233s)
- **Improvement**: 0% (noise)
- **Kept experiments**:
- **Discarded experiments**: PERF-626
