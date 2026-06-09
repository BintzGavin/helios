---
id: PERF-714
slug: promise-with-resolvers
status: complete
claimed_by: "executor-session"
created: 2024-06-09
completed: ""
result: ""
---

# PERF-714: Use Promise.withResolvers() in CdpTimeDriver hot loop

## Focus Area
The `runSetTime` hot loop in `CdpTimeDriver.ts`. We want to reduce Promise allocation and context switching overhead.

## Background Research
Currently in `CdpTimeDriver.ts`, each frame allocates a new Promise and uses an inline executor:
```typescript
const promise = new Promise<void>((resolve, reject) => {
  this.cdpResolve = resolve;
  this.cdpReject = reject;
});
```

Node.js v22 supports the standard `Promise.withResolvers()` API. Benchmarks show it can be up to 25% faster than manually saving the `resolve` and `reject` functions via an inline executor closure, as it avoids executing an extra callback and allocating an extra closure context in V8 per Promise creation.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition.
- **Render Settings**: Standard benchmark options.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.115s

## Implementation Spec

### Step 1: Replace inline executor with Promise.withResolvers()
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Locate the promise creation block in `runSetTime`:
```typescript
    const promise = new Promise<void>((resolve, reject) => {
      this.cdpResolve = resolve;
      this.cdpReject = reject;
    });
```
Replace it with:
```typescript
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    this.cdpResolve = resolve;
    this.cdpReject = reject;
```
**Why**: This uses a highly-optimized native path in V8, avoiding an extra inline executor closure allocation per frame.
**Risk**: None. Node v22 supports `Promise.withResolvers()` natively.

## Correctness Check
Run the `renderer` package tests to ensure DOM strategies function as expected.

## Results Summary
- **Best render time**: 2.435s (vs baseline ~2.408s)
- **Improvement**: -1.12%
- **Kept experiments**: None
- **Discarded experiments**: Use Promise.withResolvers in CdpTimeDriver
