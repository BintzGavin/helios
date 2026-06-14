---
id: PERF-757
slug: eliminate-process-capture-result-branching
status: complete
completed: "2024-06-13"
result: "discarded"
claimed_by: "executor-session"
created: 2024-06-13
completed: ""
result: ""
---

# PERF-757: Eliminate branch logic around processCaptureResult in DomStrategy

## Focus Area
`CaptureLoop.ts` fast path and `DomStrategy.ts`. The focus is on the conditional check inside the capture hot loop.

## Background Research
In the `CaptureLoop.ts` single and multi-worker paths, we currently do:
```typescript
const hasProcessFn = !!strategy.processCaptureResult;
// ... inside hot loop
let buffer = hasProcessFn ? strategy.processCaptureResult!(rawResult) : rawResult;
```
As discovered in PERF-726, making `processCaptureResult` mandatory and unconditionally calling an identity function on `CanvasStrategy` was marginally slower than the JavaScript truthiness check (`hasProcessFn ? ...`).
However, we can keep the interface the same while significantly optimizing `DomStrategy`. Currently, `DomStrategy` defines:
```typescript
  processCaptureResult(result: any): string | Buffer {
    return (this.lastFrameData = result.screenshotData || this.lastFrameData)!;
  }
```
If we inspect `CaptureLoop.ts` closely, it takes the `rawResult` from `await strategy.capture(...)` and then calls `processCaptureResult(rawResult)`.
But in `DomStrategy`, `strategy.capture()` simply does `return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);`, which returns an object that has `screenshotData`.

Since `DomStrategy` is the only strategy implementing `processCaptureResult`, and it's tightly coupled to how it receives CDP frames, what if we eliminate the `processCaptureResult` step entirely by just making `DomStrategy.capture()` return the processed buffer string directly?

If `DomStrategy.capture()` handles the assignment `(this.lastFrameData = result.screenshotData || this.lastFrameData)!` inside its own Promise chain (or if we can just do it natively via `then()`), we could completely remove `hasProcessFn` from `CaptureLoop.ts` and the `processCaptureResult` method from `DomStrategy`, returning directly what FFmpeg needs.

Wait, looking at PERF-703, inline caching for `.then()` closures on `strategy.capture(...)` was fast, but we also want to avoid Promise allocation overhead.
Currently `strategy.capture` is:
```typescript
  capture(page: Page, frameTime: number): Promise<any> {
    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
  }
```
If we change it to:
```typescript
  async capture(page: Page, frameTime: number): Promise<any> {
    const result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
    return (this.lastFrameData = result.screenshotData || this.lastFrameData)!;
  }
```
Async functions allocate microtasks. What if we just use a pre-bound `.then()` closure to keep it allocation-free?

```typescript
  private processBeginFrameResult = (result: any) => {
    return (this.lastFrameData = result.screenshotData || this.lastFrameData)!;
  }

  capture(page: Page, frameTime: number): Promise<any> {
    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams)
      .then(this.processBeginFrameResult);
  }
```

This way:
1. `DomStrategy.capture()` returns the final string/buffer.
2. We can remove `processCaptureResult` from `RenderStrategy` entirely.
3. In `CaptureLoop.ts`, we completely remove `hasProcessFn` and the ternary operator `let buffer = hasProcessFn ? strategy.processCaptureResult!(rawResult) : rawResult;`. We just do `let buffer = rawResult;`.

This simplifies the `CaptureLoop` AST, eliminates a branch, and simplifies the API.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark (`npm run benchmark -w packages/renderer`)
- **Render Settings**: 600x600, 30fps, 5s (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.29s (from local check)
- **Bottleneck analysis**: The `hasProcessFn ? ...` ternary inside the innermost `CaptureLoop` hot loops.

## Implementation Spec

### Step 1: Inline processCaptureResult into DomStrategy.capture
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Remove the `processCaptureResult` method entirely.
2. Add a pre-bound handler property to the class:
```typescript
  private processCaptureResultBound = (result: any): string | Buffer => {
    return (this.lastFrameData = result.screenshotData || this.lastFrameData)!;
  };
```
3. Update `capture` to chain the bound method:
```typescript
  capture(page: Page, frameTime: number): Promise<any> {
    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams).then(this.processCaptureResultBound);
  }
```
**Why**: Avoids anonymous closure allocation per frame while moving the processing step directly into the Promise resolution pipeline where it naturally fits.

### Step 2: Remove processCaptureResult from RenderStrategy
**File**: `packages/renderer/src/strategies/RenderStrategy.ts` (if exists in types, or wherever it is defined)
**What to change**: Remove the optional `processCaptureResult` method definition.

### Step 3: Remove hasProcessFn branching from CaptureLoop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In both the single worker fast path and the multi-worker `runWorker` function:
1. Remove the line `const hasProcessFn = !!strategy.processCaptureResult;`.
2. Change:
```typescript
const rawResult = await strategy.capture(page, time);
let buffer = hasProcessFn ? strategy.processCaptureResult!(rawResult) : rawResult;
```
to:
```typescript
let buffer = await strategy.capture(page, time);
```

**Why**: Removes dynamic condition checks and branching on every single frame inside the hot loops.
**Risk**: If chaining `.then()` causes a performance regression due to V8 microtask scheduling, it will show up in the benchmark. But since `send` returns a Promise anyway, adding `.then` with a cached closure usually optimizes well in V8's Promise pipeline.

## Variations
If the `.then()` chain adds measurable overhead, we could keep `processCaptureResult` but refactor it, but given PERF-726, this is the cleanest architectural way to test if eliminating the external loop branch is faster than a Promise chain.

## Canvas Smoke Test
Run canvas benchmark or `npm run build -w packages/renderer`.

## Correctness Check
Run the DOM render benchmark script (`npx tsx scripts/benchmark-perf.ts`) to ensure it produces valid outputs without regressions.

## Results Summary
- **Best render time**: 2.513s (vs baseline 2.441s)
- **Improvement**: -2.9% (Regression)
- **Kept experiments**: []
- **Discarded experiments**: [PERF-757]
