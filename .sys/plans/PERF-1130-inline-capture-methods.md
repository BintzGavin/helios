---
id: PERF-1130
slug: inline-capture-methods
status: complete
claimed_by: "executor"
created: 2024-10-22
completed: "2024-10-22"
result: "improved"
---
# PERF-1130: Inline Capture Methods

## Focus Area
DOM and Canvas single-worker fast loops (`CaptureLoop.ts`).

## Background Research
The current single-worker path relies on dynamic indirection:
```typescript
const domBeginFrame = isDomStrategy ? (frameTime: number) => strategy.capture(page, frameTime) : null;
```
Inside the hot loop, `domBeginFrame!(time)` or `strategy.capture(page, time)` is called sequentially thousands of times.
By inlining `strategy.capture(page, ...)` directly into the blocks, we avoid the overhead of a wrapper closure `domBeginFrame` and dynamic function dereferencing.

We can completely remove `domBeginFrame` closure definition and replace its usages:
`nextCapturePromise = domBeginFrame!(...)` -> `nextCapturePromise = strategy.capture(page, ...)`

This aligns the `isDomStrategy` fast path to directly invoke the underlying capture mechanism, reducing AST stack depth.

## Benchmark Configuration
- **Composition URL**: `dom-benchmark`
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds

## Implementation Spec

### Step 1: Remove `domBeginFrame` closure
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Delete the `domBeginFrame` closure assignment:
```typescript
      const domBeginFrame = isDomStrategy
        ? (frameTime: number) => strategy.capture(page, frameTime)
        : null;
```

### Step 2: Replace `domBeginFrame` with `strategy.capture`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the `isDomStrategy` true paths (both initial frame logic and inner `while` loop), replace all invocations of `domBeginFrame!(X)` with `strategy.capture(page, X)`.

## Correctness Check
Run canvas and DOM smoke tests to verify.