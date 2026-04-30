---
id: PERF-395
slug: eliminate-promise-chain-domstrategy
status: completed
claimed_by: ""
created: 2024-05-24
completed: ""
result: "improved"
---

# PERF-395: Eliminate Promise Chain Allocation in DomStrategy Capture

## Focus Area
`DomStrategy.ts` Frame Capture Hot Loop. This targets the elimination of dynamic closure and Promise chain allocations on every single frame during the core `capture()` method to reduce V8 garbage collection pressure.

## Background Research
In the current implementation of `DomStrategy.ts`, the CDP command to capture a frame is invoked as:
`const result: any = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams).catch(() => ({}));`

The `.catch(() => ({}))` syntax dynamically allocates a new anonymous arrow function and creates an additional Promise object in the chain for *every single frame* processed. In a typical 60fps render, this creates thousands of short-lived objects that trigger frequent minor garbage collections. Prior experiments (such as PERF-384 and PERF-386) successfully improved median render times and pipeline stability by removing similar Promise chain allocations (`.then` and `.catch`) in TimeDrivers, replacing them with either pre-bound closures, direct casting, or native `try/catch` control flow.

By replacing the `.catch()` Promise chain with a standard async `try/catch` block, V8 can handle the exception using native control flow without allocating additional closures or Promise links on the heap.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Standard render benchmark settings.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 48.058s (from PERF-366)
- **Bottleneck analysis**: V8 heap allocations in the hot loop cause unnecessary garbage collection pauses during intensive DOM capture.

## Implementation Spec

### Step 1: Replace Promise chain with try/catch in DomStrategy
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Inside the `capture()` method, locate the following line:
```typescript
const result: any = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams).catch(() => ({}));
```

Replace it entirely with a native `try/catch` block:
```typescript
let result: any;
try {
  result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
} catch (e) {
  result = {};
}
```

**Why**: Using standard async `try/catch` allows V8 to process the asynchronous result without allocating additional closures (`() => ({})`) or chaining new Promises on the heap, directly reducing garbage collection pressure.
**Risk**: Negligible. The functional fallback behavior (assigning an empty object `{}` upon CDP error so that `result.screenshotData` is undefined) remains completely identical to the previous `.catch()` implementation.

## Variations
None.

## Canvas Smoke Test
Run a basic Canvas smoke test to ensure no shared paths were inadvertently broken.

## Correctness Check
Run a basic DOM correctness check to ensure output is still correct.

## Prior Art
- **PERF-384**: Successfully eliminated Promise chain allocation in `SeekTimeDriver.setTime`.
- **PERF-386**: Eliminated Promise chain allocation in `CdpTimeDriver` stability check.
