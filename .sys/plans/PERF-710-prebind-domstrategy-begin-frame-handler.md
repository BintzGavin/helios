---
id: PERF-710
slug: prebind-domstrategy-begin-frame-handler
status: complete
claimed_by: ""
created: 2024-05-27
completed: ""
result: "Discarded, regression to 2.739s"
---

# PERF-710: Prebind `handleBeginFrameResult` logic and simplify `.then` in DomStrategy

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts`
Specifically the `capture` method and the `handleBeginFrameResult` prebound method.

## Background Research
In PERF-704, we optimized the promise chain inside `DomStrategy.capture()` by pre-binding `.then` handlers to eliminate closure allocations per frame. In PERF-701, we simplified the chained `.then()` logic directly, avoiding `async`/`await` wraps.
Currently, `DomStrategy.capture()` does:
```typescript
  capture(page: Page, frameTime: number): Promise<Buffer | string> {
    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams)
      .then(this.handleBeginFrameResult);
  }
```
with `handleBeginFrameResult` being:
```typescript
  private handleBeginFrameResult = (result: any): string | Buffer => {
    return (this.lastFrameData = result.screenshotData || this.lastFrameData)!;
  };
```
While `handleBeginFrameResult` is prebound as an instance field property, we can optimize this further by avoiding the function dispatch overhead entirely and resolving the CDP Promise inline through native async/await, or optimizing the `.then` closure. Wait, previous experiments showed returning the promise chain is better than `async/await` in `capture()`. But we can simplify the `.then` handler to be a static inline arrow function or just an inline closure `(res) => (this.lastFrameData = res.screenshotData || this.lastFrameData)!;` to avoid instance property lookups (`this.handleBeginFrameResult`) and function call dispatch if V8 can optimize the inline closure better than a bound property.

Actually, PERF-704 showed that removing per-frame closures by pre-binding `.then` reduced GC pressure but resulted in a *worse* render time (~2.327s vs baseline ~2.115s), yet we kept it for architectural simplicity. Wait! If prebinding `.then` as an instance property was *slower*, and we want the *lowest* DOM render time, we should revert it to an inline anonymous closure `result => this.lastFrameData = result.screenshotData || this.lastFrameData` and measure if it regains the baseline!

Let's test reverting the prebound `handleBeginFrameResult` back to an inline anonymous closure in `DomStrategy.capture()`, as V8 inline caching performs exceptionally well with anonymous closures within hot paths.

## Benchmark Configuration
- **Composition URL**: DOM benchmark script (`npx tsx scripts/benchmark-perf.ts`)
- **Render Settings**: Fixed fixture
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.115s (PERF-699) or ~2.327s (PERF-704 regression we kept). We want to reclaim the ~2.115s performance.
- **Bottleneck analysis**: Instance property lookup and dispatch overhead in V8 vs highly optimized inline closures.

## Implementation Spec

### Step 1: Revert prebound handler in DomStrategy
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Remove the private `handleBeginFrameResult` arrow function field.
2. Update `capture` to use an inline closure:
```typescript
  capture(page: Page, frameTime: number): Promise<Buffer | string> {
    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams)
      .then(result => (this.lastFrameData = result.screenshotData || this.lastFrameData)!);
  }
```
**Why**: V8 strongly optimizes inline anonymous closures and inline caching, while instance property lookups for bound functions (as done in PERF-704) add property resolution overhead and context indirection that measurably regressed performance.
**Risk**: Negligible. Reverting a known regression.

## Correctness Check
Run the DOM benchmark and ensure the video renders properly and the output `.mp4` file is generated and > 0 bytes.

## Canvas Smoke Test
Run the full test suite (`npm run test -w packages/renderer`) to ensure nothing breaks.
