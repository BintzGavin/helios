---
id: PERF-514
slug: optimize-browserpool-concurrency
status: unclaimed
claimed_by: ""
created: 2024-05-16
completed: ""
result: ""
---

# PERF-514: Optimize BrowserPool Concurrency Formula

## Focus Area
`BrowserPool.ts` (concurrency logic). We want to test different combinations for `concurrency` when calculating how many pages to spawn in `BrowserPool.init`.

## Background Research
Currently, concurrency is calculated as `Math.max(1, (os.cpus().length || 4) - 1)`. In the microVM, `os.cpus().length` is likely 4, meaning we get `concurrency = 3`. In a previous failed experiment (`PERF-504`), increasing Playwright concurrency exhausted memory and CPU resources, causing the render time to slow down significantly to ~26.429s. Another failed experiment (`PERF-505`) attempted dedicated browser contexts per worker and worsened render time. What if we try lowering the concurrency? We will write a plan to experiment with exactly `2` to see if thread contention is reduced inside the single Chromium process.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~18.740s
- **Bottleneck analysis**: Thread contention in Chromium's single renderer process severely limits parallel frame capture throughput.

## Implementation Spec

### Step 1: Change Concurrency
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Change `const concurrency = Math.max(1, (os.cpus().length || 4) - 1);` to `const concurrency = 2;`
**Why**: With site isolation disabled, all pages share the same renderer process. 3 pages might be too many for the Chromium main thread to juggle, leading to more context switching overhead. Lowering to 2 might provide a better balance between parallelism and main thread contention.
**Risk**: Slower throughput due to fewer parallel workers.

## Canvas Smoke Test
Run a basic canvas render (`mode: 'canvas'`) to ensure the browser argument changes don't crash or prevent Canvas rendering.

## Correctness Check
Verify the rendered output video to ensure the parallel frame captures are still ordered and visually correct.
