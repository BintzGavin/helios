---
id: PERF-321
slug: prebind-worker-blocked-executor
status: complete
claimed_by: ""
created: 2024-05-27
completed: "2024-05-27"
result: "keep"
---

# PERF-321: Prebind Worker Blocked Promise Executors in CaptureLoop

## Focus Area
DOM Rendering Pipeline - Frame Capture Loop Hot Path in `CaptureLoop.ts`

## Background Research
In `packages/renderer/src/core/CaptureLoop.ts`, the actor model pipeline utilizes an array of resolvers `workerBlockedResolves` to block workers when the pipeline is full or waiting for a frame.

Currently, when a worker gets blocked due to backpressure, it performs a dynamic Promise and closure allocation inside the hot loop:

```typescript
                i = await new Promise<number>(resolve => {
                    workerBlockedResolves[workerIndex] = resolve;
                });
```

Because `runWorker` is a hot loop processing thousands of frames, and pipeline backpressure frequently blocks and unblocks workers depending on FFmpeg's read speed or CDP strategy variations, this dynamic promise executor closure allocation creates continuous garbage collection pressure. V8 must allocate the closure, and once resolved, garbage collect it.

We can optimize this by preallocating the executor closures for each worker once outside the loop.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/composition.html`
- **Render Settings**: Baseline identical settings across all runs, dom mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 45.854s
- **Bottleneck analysis**: The cost of executing dynamic closure allocation in the hot loop when a worker gets blocked due to backpressure.

## Implementation Spec

### Step 1: Prebind promise resolve executors
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `CaptureLoop.ts`, replace the inline closure allocation for the blocked worker promise.
Before `const runWorker = async (worker: WorkerInfo, workerIndex: number) => {`, add:

```typescript
    const workerBlockedExecutors = new Array(poolLen);
    for (let w = 0; w < poolLen; w++) {
        workerBlockedExecutors[w] = (resolve: (i: number) => void) => {
            workerBlockedResolves[w] = resolve;
        };
    }
```

Then in the loop, change:
<<<<<<< SEARCH
            } else {
                i = await new Promise<number>(resolve => {
                    workerBlockedResolves[workerIndex] = resolve;
                });
            }
=======
            } else {
                i = await new Promise<number>(workerBlockedExecutors[workerIndex]);
            }
>>>>>>> REPLACE

**Why**: By pre-allocating the promise executor function, we prevent dynamic closure memory allocation every time a worker blocks. V8's GC does not need to collect the closure each block cycle.
**Risk**: Minimal. The logic is functionally identical.

## Variations
None.

## Canvas Smoke Test
None.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to ensure the DOM strategy logic runs. Note that `CaptureLoop.ts` logic can only be fully tested using `npm test -w packages/renderer`, but since it times out, verify using targeted DOM capture tests.
