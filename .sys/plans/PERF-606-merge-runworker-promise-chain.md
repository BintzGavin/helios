---
id: PERF-606
slug: merge-runworker-promise-chain
status: complete
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---

# PERF-606: Merge Promise Catch Handlers in runWorker

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
By merging the `catch` block as the second parameter (the `onRejected` handler) into the previous `.then()`, we save allocating the trailing Promise while preserving exact semantics since the `onFulfilled` logic cannot throw. Note: `PERF-591` previously tried to do this for both `CaptureLoop.ts` and `DomStrategy.ts` and was discarded because the negligible microtask savings did not outweigh potential V8 deoptimization from altering the promise structure. We will test it again applied only to `CaptureLoop.ts` to see if isolating the change makes a difference.

## Baseline
- **Current estimated render time**: ~1.267s
- **Bottleneck analysis**: Microtask and Promise allocation overhead in the `runWorker` hot loop.

## Implementation Spec

### Step 1: Merge Catch in `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `runWorker` promise chain around line 187, the executor must read the exact code in `runWorker` and rewrite the `.then().catch()` chain to merge the `.catch()` block into the preceding `.then()` as its second argument (`.then(onFulfilled, onRejected)`).

**Why**: Eliminates the allocation of the final `.catch()` Promise.

## Correctness Check
Run the `benchmark-perf.ts` script to test performance, followed by `npx tsx packages/renderer/tests/run-all.ts` to verify correctness and ensure no unhandled promise rejections occur.

## Results Summary
```tsv
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	1.402	150	106.97	70.0	discard	baseline
2	1.489	150	100.72	70.0	discard	baseline
3	1.507	150	99.51	70.1	discard	baseline
```

## New Results Summary
```tsv
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	3.018	150	49.69	70.2	keep	merged runWorker promise chain
2	1.403	150	106.89	70.1	keep	merged runWorker promise chain
3	1.466	150	102.35	70.1	keep	merged runWorker promise chain
```
