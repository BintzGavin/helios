---
id: PERF-758
slug: eliminate-process-capture-result-branching
status: unclaimed
claimed_by: ""
created: 2024-06-13
completed: ""
result: ""
---

# PERF-758: Eliminate branch logic around processCaptureResult in DomStrategy

## Focus Area
`CaptureLoop.ts` fast path and `DomStrategy.ts`. The focus is on the conditional check inside the capture hot loop.

## Background Research
In the `CaptureLoop.ts` single and multi-worker paths, we currently do:
```typescript
const hasProcessFn = !!strategy.processCaptureResult;
// ... inside hot loop
let buffer = hasProcessFn ? strategy.processCaptureResult!(rawResult) : rawResult;
```
Since `DomStrategy` is the only strategy implementing `processCaptureResult`, and it's tightly coupled to how it receives CDP frames, what if we eliminate the `processCaptureResult` step entirely by just making `DomStrategy.capture()` return the processed buffer string directly?

We can use a pre-bound `.then()` closure to keep it allocation-free:

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
- **Composition URL**: The standard DOM benchmark
- **Render Settings**: 600x600, 30fps, 5s (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.41s
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
**File**: `packages/renderer/src/strategies/RenderStrategy.ts`
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

## Canvas Smoke Test
Run canvas benchmark or `npm run build -w packages/renderer`.

## Correctness Check
Run the DOM render benchmark script (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts`) to ensure it produces valid outputs without regressions.
