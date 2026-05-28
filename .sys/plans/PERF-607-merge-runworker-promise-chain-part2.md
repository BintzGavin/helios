---
id: PERF-607
slug: merge-runworker-promise-chain-part2
status: unclaimed
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---

# PERF-607: Merge Promise Catch Handlers in runWorker

## Focus Area
DOM Rendering Pipeline - Promise allocations in `packages/renderer/src/core/CaptureLoop.ts` hot loop.

## Background Research
In V8, chaining `.then().catch()` creates two intermediate Promises because `.catch()` allocates a new Promise and schedules a new microtask. In `CaptureLoop.ts`, the `runWorker` multi-worker loop does exactly this:
```typescript
            await timePromise
                .then(() => strategy.capture(page, time))
                .then((buffer) => { ... })
                .catch((e) => { ... });
```
By merging the `catch` block as the second parameter (the `onRejected` handler) into the previous `.then()`, we save allocating the trailing Promise while preserving exact semantics since the `onFulfilled` logic cannot throw. Note: `PERF-591` previously tried to do this for both `CaptureLoop.ts` and `DomStrategy.ts` and was discarded because the negligible microtask savings did not outweigh potential V8 deoptimization from altering the promise structure. We will test it again applied only to `CaptureLoop.ts` to see if isolating the change makes a difference. Previous attempt in PERF-606 was incorrectly executed, so this is a retry.

## Baseline
- **Current estimated render time**: ~1.267s
- **Bottleneck analysis**: Microtask and Promise allocation overhead in the `runWorker` hot loop.

## Implementation Spec

### Step 1: Merge Catch in `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `runWorker` promise chain around line 187-196, the executor must read the exact code in `runWorker` and rewrite the `.then().catch()` chain to merge the `.catch()` block into the preceding `.then()` as its second argument (`.then(onFulfilled, onRejected)`).

**Why**: Eliminates the allocation of the final `.catch()` Promise.

## Correctness Check
Run `npx tsx packages/renderer/tests/run-all.ts` to verify correctness and ensure no unhandled promise rejections occur.
