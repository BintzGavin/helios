---
id: PERF-503
slug: enable-software-rasterizer
status: unclaimed
claimed_by: ""
created: 2024-05-15
completed: ""
result: ""
---

# PERF-503: Enable CPU Compositing and Software Rasterizer

## Focus Area
DOM Capture Pipeline (`BrowserPool.ts`). Specifically targeting the Chromium launch arguments to enable the multithreaded software rasterizer (SwiftShader) and CPU compositing in a GPU-less environment.

## Background Research
Currently, when Helios launches Chromium in a GPU-less environment like the Jules microVM, it passes `--disable-gpu`, `--disable-software-rasterizer`, and `--disable-gpu-compositing`.
Disabling the software rasterizer and compositing forces Chromium to use a legacy, unaccelerated, single-threaded bitmap rendering path for the DOM.
By allowing the software rasterizer (SwiftShader) and CPU compositing to remain enabled (passing *only* `--disable-gpu`), Chromium can leverage multiple CPU cores to rasterize DOM layers and composite them. In a multi-core CPU-bound microVM, utilizing SwiftShader should significantly decrease the latency of the internal Chromium compositor frame generation, directly speeding up the `HeadlessExperimental.beginFrame` CDP call.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1920x1080, 60 FPS, 10s duration (600 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~25.3s
- **Bottleneck analysis**: The `HeadlessExperimental.beginFrame` CDP call dominates the hot loop. A large portion of this time is spent in Chromium's internal rendering and rasterization pipeline before the JPEG screenshot is generated.

## Implementation Spec

### Step 1: Remove Disabling Flags for Software Rasterization
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
In the `GPU_DISABLED_ARGS` array, remove `--disable-software-rasterizer` and `--disable-gpu-compositing`.

Use the following `replace_with_git_merge_diff` structure:

<<<<<<< SEARCH
const GPU_DISABLED_ARGS = [
  '--disable-gpu',
  '--disable-software-rasterizer',
  '--disable-gpu-compositing',
];
=======
const GPU_DISABLED_ARGS = [
  '--disable-gpu',
];
>>>>>>> REPLACE

**Why**: Allowing Chromium to fallback to SwiftShader (the CPU software rasterizer) and retaining CPU compositing allows DOM rendering to be multithreaded across the available CPU cores, rather than forced into a legacy single-threaded uncomposited path.

**Risk**: High memory usage from SwiftShader or potential incompatibilities with Playwright's headless shell, though modern Chromium is well-tested with SwiftShader as a fallback.

## Canvas Smoke Test
Run a basic canvas test to ensure the shared codebase is not broken.

## Correctness Check
Run the `simple-animation` benchmark and inspect the `output.mp4` to ensure it plays correctly and is visually acceptable (no missing layers or blank frames).
