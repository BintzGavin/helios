---
id: PERF-158
slug: disable-site-isolation
status: unclaimed
claimed_by: ""
created: 2024-05-26
completed: ""
result: ""
---

# PERF-158: Disable Chromium Site Isolation

## Focus Area
Chromium Process Model & CPU Overhead (in `packages/renderer/src/Renderer.ts`).

## Background Research
Chromium relies heavily on a multi-process architecture to enforce Site Isolation, spinning up separate OS processes for cross-site iframes and isolated rendering contexts. In our highly constrained CPU-only microVM environment, the overhead of process creation, memory footprint, and constant IPC context switching between these isolated processes degrades rendering performance. Since our renderer executes deterministic, local, and trusted composition bundles, security boundaries like Site Isolation are unnecessary. Disabling these features allows Chromium to operate more efficiently with fewer processes, allocating more CPU cycles to the main rendering and compositor threads.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds (150 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.057s
- **Bottleneck analysis**: CPU time spent on OS-level context switching and memory management for unnecessary Chromium isolation processes.

## Implementation Spec

### Step 1: Add Site Isolation disable flags to Chromium arguments
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Add `--disable-site-isolation-trials` and `--disable-features=IsolateOrigins,site-per-process` to the `DEFAULT_BROWSER_ARGS` array.
**Why**: This explicitly turns off Chromium's out-of-process iframes and site isolation security boundaries, reducing the total process count and saving CPU cycles otherwise lost to IPC and process management.
**Risk**: Some extremely complex WebGL or highly structured iframed animations might behave slightly differently without isolation, but for standard single-page application compositions, it should be fully transparent.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure the Canvas strategy remains unaffected.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to ensure frames are still captured correctly.

## Prior Art
- Standard Chromium headless optimization recommendations for trusted environments (Docker, CI).
