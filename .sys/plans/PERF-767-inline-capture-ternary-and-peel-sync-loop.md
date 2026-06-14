---
id: PERF-767
slug: inline-capture-ternary-and-peel-sync-loop
status: unclaimed
claimed_by: ""
created: 2024-06-14
completed: ""
result: ""
---

# PERF-767: Inline Capture Ternary and Peel Sync Media Loop

## Focus Area
The single-worker fast path inside `packages/renderer/src/core/CaptureLoop.ts` and the `defaultSyncMedia` method in `packages/renderer/src/drivers/CdpTimeDriver.ts`. This targets the synchronous execution overhead immediately surrounding the CDP async calls to reduce V8 JIT context allocation and loop evaluation overhead.

## Background Research
1. **Async Context Allocation**: In V8, async functions are compiled to state machines. Local variables that span an `await` point or are used immediately after must be stored in a heap-allocated context object so they survive the generator suspension. In `CaptureLoop.ts`, `const rawResult = await strategy.capture(page, time);` stores the result in a local variable which is then immediately passed to a ternary condition (`let buffer = hasProcessFn ? strategy.processCaptureResult!(rawResult) : rawResult;`). If we inline the `await` call directly into the ternary branches, V8 can evaluate the condition, execute the `await`, and route the result directly into the function call (or variable assignment) without needing a separate intermediate block-scoped variable, reducing context allocation overhead per frame.
2. **Loop Peeling**: In `CdpTimeDriver.ts`, `defaultSyncMedia` iterates over `this.executionContextIds` using a `for` loop. For the vast majority of renders (and benchmarks), there is exactly 1 execution context (the main frame). V8's TurboFan optimizes `for` loops efficiently, but entirely bypassing the loop AST and jump instructions via explicit loop peeling (`if (len === 1)`) yields a strictly faster code path for the monomorphic case.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 150 frames, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.664s
- **Bottleneck analysis**: Micro-optimizations in the V8 hot path execution logic immediately surrounding Playwright IPC calls.

## Implementation Spec

### Step 1: Inline `rawResult` in `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker fast path, replace:
```typescript
                const rawResult = await strategy.capture(page, time);
                let buffer = hasProcessFn ? strategy.processCaptureResult!(rawResult) : rawResult;
```
With:
```typescript
                const buffer = hasProcessFn
                    ? strategy.processCaptureResult!(await strategy.capture(page, time))
                    : await strategy.capture(page, time);
```
**Why**: Avoids intermediate local variable allocation across the async state machine boundary.
**Risk**: Negligible. Functionally identical.

### Step 2: Peel `defaultSyncMedia` loop in `CdpTimeDriver.ts`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Replace `defaultSyncMedia` implementation with:
```typescript
  private defaultSyncMedia() {
    const len = this.executionContextIds.length;
    if (len === 0) {
      this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams);
    } else if (len === 1) {
      this.client!.send('Runtime.evaluate', this.multiFrameSyncMediaParams[0]);
    } else {
      for (let i = 0; i < len; i++) {
        this.client!.send('Runtime.evaluate', this.multiFrameSyncMediaParams[i]);
      }
    }
  }
```
**Why**: Bypasses the V8 loop setup and iterator overhead for the highly common `len === 1` case.
**Risk**: Negligible. Functionally identical.

## Variations
None.

## Correctness Check
Run the standard codec verification tests and ensure the single-worker benchmark executes without throwing.
