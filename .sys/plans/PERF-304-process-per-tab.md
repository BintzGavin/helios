---
id: PERF-304
slug: process-per-tab
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-304: Process Per Tab Architecture for Playwright Headless Chromium

## Focus Area
Browser Initialization (`BrowserPool.ts`) - Chromium Architecture Flags

## Background Research
Currently, our `BrowserPool` instantiates headless Chromium with a large number of feature-disabling flags. However, Chromium's architecture has evolved such that site isolation is deeply ingrained, and disabling it does not necessarily guarantee a flat process model.

In `PERF-213`, we attempted to force everything into a single process using `--single-process`, but the results failed or did not show improvement.

Another well-known Chromium flag, `--process-per-tab`, attempts to consolidate renderer processes so that multiple tabs (or pages, in Playwright terminology) belonging to the same site/domain share a single renderer process, rather than spawning a new process per page. In our environment, where we launch multiple `page` instances inside a single `context` navigating to the same local `compositionUrl`, forcing `--process-per-tab` can reduce the number of spawned OS processes and reduce IPC contention, while remaining more stable than `--single-process`.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`tests/fixtures/benchmark.ts`)
- **Render Settings**: 1920x1080, 60fps, 10s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~47.554s (from `docs/status/RENDERER-EXPERIMENTS.md`)
- **Bottleneck analysis**: CPU contention and memory pressure from multiple Chromium renderer processes running concurrently on limited VM cores.

## Implementation Spec

### Step 1: Add `--process-per-tab` to `BrowserPool.ts`
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Append the string `'--process-per-tab'` to the `DEFAULT_BROWSER_ARGS` array.

**Why**: By instructing Chromium to use a process per tab (which often consolidates into process per site for local identical URLs), we can potentially halve the number of renderer processes spawned by our worker pool, reducing OS-level context switching overhead.
**Risk**: Playwright might isolate pages regardless of this flag, or the flag might have been deprecated/ignored in modern `chrome-headless-shell`. However, it is a safe flag to test.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` to ensure Canvas mode still functions.

## Correctness Check
Run the DOM render tests to ensure multi-page worker pools still capture frames correctly when sharing a renderer process.

## Prior Art
- `PERF-213`: Attempted `--single-process` which failed.
