---
id: PERF-518
slug: browserpool-concurrency-two
status: complete
completed: 2024-05-16
result: failed
claimed_by: ""
created: 2024-05-16
completed: ""
result: ""
---

# PERF-518: Optimize BrowserPool Concurrency Formula to Two

## Focus Area
`BrowserPool.ts` (concurrency logic). We want to test reducing the `concurrency` to exactly `2` to optimize thread usage inside the Chromium process given site isolation is disabled.

## Background Research
Currently, concurrency is calculated as `Math.max(1, (os.cpus().length || 4) - 1)`. In the microVM, `os.cpus().length` is likely 4, meaning we get `concurrency = 3`. Since `--disable-site-isolation-trials` is passed to the browser, all 3 pages are forced into a single renderer process, resulting in heavy thread contention. Lowering the number of concurrent pages to 2 might provide a better balance between parallelism and main thread saturation in the single Chromium process. (Note: A previous experiment `PERF-504` tried *increasing* it which severely regressed performance, and `PERF-514` was proposed to lower it but wasn't executed or claimed. We are formally planning the concurrency=2 test).

## Benchmark Configuration
- **Composition URL**: DOM benchmark composition
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~17.687s
- **Bottleneck analysis**: Thread contention in Chromium's single renderer process severely limits parallel frame capture throughput when overloaded with too many contexts.

## Implementation Spec

### Step 1: Change Concurrency
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Change `const concurrency = Math.max(1, (os.cpus().length || 4) - 1);` to `const concurrency = 2;`

Specifically:
```typescript
<<<<<<< SEARCH
    const concurrency = Math.max(1, (os.cpus().length || 4) - 1);
=======
    const concurrency = 2;
>>>>>>> REPLACE
```

**Why**: With site isolation disabled, all pages share the same renderer process. 3 pages might be too many for the Chromium main thread to juggle, leading to more context switching overhead. Lowering to 2 might provide a better balance.
**Risk**: Slower throughput due to fewer parallel workers.

## Variations
### Variation A: Concurrency = 1
If `concurrency = 2` doesn't improve performance, test `concurrency = 1` to establish if eliminating contention entirely is faster than partial parallelism in a single process.

## Canvas Smoke Test
Run a basic canvas render (`mode: 'canvas'`) to ensure changes don't break standard flows.

## Correctness Check
Verify the rendered output video to ensure the parallel frame captures are still ordered and visually correct.

## Results Summary
- **Best render time**: 18.210s (Baseline)
- **Improvement**: 0% (Regressed)
- **Kept experiments**: None
- **Discarded experiments**:
  - `concurrency = 2` (degraded to ~20.89s)
  - `concurrency = 1` (degraded to ~28.15s)
