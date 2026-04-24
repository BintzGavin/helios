---
id: PERF-349
slug: process-per-tab
status: unclaimed
claimed_by: ""
created: 2026-10-18
completed: ""
result: ""
---

# PERF-349: Implement Process-per-Tab configuration for Chromium

## Focus Area
`packages/renderer/src/core/BrowserPool.ts` - Browser launch arguments.

## Background Research
Currently, we launch Chromium with `--disable-site-isolation-trials` and `--disable-features=IsolateOrigins,site-per-process`. While this saves memory by grouping cross-site iframes into the same process, it can bottleneck CPU-bound rendering tasks in a multi-page pool.
Our `BrowserPool.ts` launches multiple pages (tabs) within a single browser context to parallelize frame capture. By default, Chromium groups tabs from the same origin (in our case, `file://` or `http://localhost`) into a single renderer process.
Since all our workers are rendering the exact same composition URL, they all share a single Chromium renderer process. This means that despite having `os.cpus().length` workers in Node.js, the actual DOM manipulation, JS execution, and (critically) software-based PNG encoding in Chromium are serialized or heavily contended on a single process.

To fix this, we can force Chromium to create a new renderer process for every page by using `--process-per-tab`.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10 duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~47.6s
- **Bottleneck analysis**: IPC and single-process contention inside Chromium because multiple tabs rendering the same URL share a single renderer process.

## Implementation Spec

### Step 1: Add `--process-per-tab` to Browser Arguments
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Add `'--process-per-tab'` to the `DEFAULT_BROWSER_ARGS` array.

```typescript
<<<<<<< SEARCH
  '--disable-smooth-scrolling'
];
=======
  '--disable-smooth-scrolling',
  '--process-per-tab'
];
>>>>>>> REPLACE
```

**Why**: Forces Chromium to spawn a new renderer process for every worker page, allowing true parallelization of DOM updates and PNG encoding across CPU cores instead of bottlenecking on a single process.
**Risk**: Increased memory usage. In a memory-constrained environment, this could lead to swapping or OOM kills. However, Jules microVMs are generally CPU-bound for rendering, not memory-bound.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still launches correctly.

## Correctness Check
Run the DOM render benchmark script multiple times to verify median render time improvement and ensure generated `output.mp4` contains 600 correct frames.

## Prior Art
- PERF-304 attempted this but was discarded. However, since then, we've optimized object allocations and the node event loop significantly, meaning the Chromium process is now more likely to be the true bottleneck.
