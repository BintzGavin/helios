---
id: PERF-576
slug: browser-pool-concurrency-three
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-576: Test Exact Core Match Concurrency for DOM Strategy

## Focus Area
`BrowserPool.ts` concurrency initialization.

## Background Research
Currently, `BrowserPool.ts` calculates concurrency as `Math.max(1, (os.cpus().length || 4) - 1)`. In PERF-574, we tested `Math.max(1, (os.cpus().length || 4) * 2 - 1)`, which regressed due to too much context switching. The current calculation `(4 - 1)` spawns 3 workers on a 4-core machine. Since rendering DOM frames via Playwright CDP is I/O bound on IPC wait, testing exactly 4 workers on a 4-core machine might provide a sweet spot, avoiding the contention of oversubscription while using all available logical cores.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 150 frames, 30fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.449s (microVM)
- **Bottleneck analysis**: Worker IPC and waiting on Playwright WebSocket CDP replies for `beginFrame` and `Runtime.evaluate`.

## Implementation Spec

### Step 1: Update BrowserPool Concurrency
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
In `init()`, change the concurrency calculation:
```typescript
<<<<<<< SEARCH
    const concurrency = Math.max(1, (os.cpus().length || 4) - 1);
=======
    const concurrency = Math.max(1, (os.cpus().length || 4));
>>>>>>> REPLACE
```
**Why**: Matches the number of workers exactly to the number of logical cores, potentially improving throughput without the overhead seen in PERF-574.
**Risk**: Might introduce slight CPU contention or Memory starvation compared to leaving one core free.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- --run`

## Correctness Check
Run the DOM render benchmark script (`npx tsx scripts/benchmark-perf.ts`) to measure performance and ensure valid output video generation.
