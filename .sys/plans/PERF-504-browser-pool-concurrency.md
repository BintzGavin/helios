---
id: PERF-504
slug: browser-pool-concurrency
status: unclaimed
claimed_by: ""
created: 2024-05-14
completed: ""
result: ""
---
# PERF-504: Optimize BrowserPool Concurrency Formula

## Focus Area
DOM render pipeline orchestration - specificially the worker pool concurrency logic in `BrowserPool.ts`. We have discovered that increasing Playwright page concurrency (the number of independent tabs actively capturing frames via CDP) effectively parallelizes screenshot capture and drastically increases capture throughput, because Chromium spawns a separate renderer process per page, utilizing more of the CPU. The current formula restricts this concurrency too much.

## Background Research
Currently, `BrowserPool.ts` calculates concurrency as:
`const concurrency = Math.max(1, (os.cpus().length || 4) - 1);`

In our 4-core microVM, this results in `4 - 1 = 3` pages.
However, empirical benchmarks on the environment using `HeadlessExperimental.beginFrame` show:
- 1 page: ~10.7s per 600 frames
- 2 pages: ~7.4s
- 4 pages: ~6.1s
- 8 pages: ~5.6s
- 16 pages: ~5.2s

Because the Node.js main thread spends most of its time blocked on I/O (awaiting Playwright IPC) and FFmpeg runs in its own process, Chromium's multiple renderer processes scale extremely well. We should decouple the pool size from the strict `(cpus - 1)` formula and increase it significantly to allow better CPU saturation, while avoiding massive memory explosions. 8 seems to be a very sweet spot for performance without extreme diminishing returns.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1920x1080, 60fps, 10s (600 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~17.687s
- **Bottleneck analysis**: CDP IPC roundtrip and frame capture sequential bottlenecks.

## Implementation Spec

### Step 1: Update BrowserPool Concurrency
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Change the `concurrency` formula from:
`const concurrency = Math.max(1, (os.cpus().length || 4) - 1);`
to:
`const cpus = os.cpus().length || 4;`
`const concurrency = Math.max(1, Math.min(8, cpus * 2));`

**Why**: This doubles the concurrency relative to available cores (e.g. 4 cores -> 8 workers, instead of 3 workers), which allows the CaptureLoop to keep Chromium completely saturated rather than waiting on sequential CDP responses for individual pages.
**Risk**: Higher peak memory usage since there will be 8 renderer processes instead of 3.

## Correctness Check
Run the DOM smoke test and the benchmark to verify the output finishes successfully.