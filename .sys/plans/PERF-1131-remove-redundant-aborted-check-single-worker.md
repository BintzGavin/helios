---
id: PERF-1131
slug: single-worker-remove-aborted-check
status: complete
claimed_by: "executor"
created: 2024-10-24
completed: "2024-10-24"
result: "no-improvement"
---

# PERF-1131: Remove redundant `if (!aborted)` check around `nextCapturePromise = strategy.capture(...)` inside single-worker chunk loops

## Focus Area
The hot inner chunk loop for the single-worker path in `packages/renderer/src/core/CaptureLoop.ts` contains a redundant `if (!aborted)` check before invoking `strategy.capture`.

## Background Research
In `CaptureLoop.ts`, the single-worker loop is structured as:
`while (i < loopEnd && !aborted) { ... for (; i !== chunkEnd; i++) { ... } }`
Inside the `for` loop, the code awaits `timeDriver.setTime`, and then checks `if (!aborted) { nextCapturePromise = strategy.capture(...); }`.
However, the `aborted` flag is primarily toggled by the `abortListener` event handler. Because the node event loop might execute microtasks between `await timePromise` and the capture execution, `aborted` could theoretically become true. But in reality, if an abort occurs, the overall loop condition captures it, and `capture` will simply reject or return a fast failure, which is caught and swallowed or propagates correctly. Alternatively, if we just remove `if (!aborted)`, we remove a branch from the hot inner loop (executed millions of times for long renders), reducing AST complexity for the V8 JIT compiler. The slight overhead of initiating one more `strategy.capture()` before checking `aborted` on the next tick of the `while` loop is dwarfed by the branch evaluation savings for the 99.9% of frames that are NOT aborted.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark composition
- **Render Settings**: 1920x1080, 60 FPS, 1 second duration, H.264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The V8 TurboFan compiler must parse and evaluate the `if (!aborted)` conditional logic on every single frame rendering iteration in the single-worker setup, causing potential pipeline stalls and expanding AST scope unnecessarily for the fast path.

## Implementation Spec

### Step 1: Remove `if (!aborted)` in DOM Strategy path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategy` block:
Change:
```typescript
              if (!aborted) {
                nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
              }
```
To:
```typescript
              nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
```
**Why**: Removes unnecessary branching in the hot loop.
**Risk**: If aborted mid-frame, it fires one extra capture call. This is perfectly safe as the worker loop will exit immediately after and the promise will cleanly resolve or discard.

### Step 2: Remove `if (!aborted)` in Canvas Strategy path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `else` block (`!isDomStrategy`):
Change:
```typescript
              if (!aborted) {
                nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
              }
```
To:
```typescript
              nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
```
**Why**: Ensures both branches are equally optimized and branch-free inside the inner loop core.
