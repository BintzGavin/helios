---
id: PERF-106
slug: single-process-chromium
status: unclaimed
claimed_by: ""
created: 2024-03-29
completed: ""
result: ""
---

# PERF-106: Disable Site Isolation Trials

## Focus Area
DOM Rendering Pipeline - Chromium Browser Setup

## Background Research
In the past, appending lightweight browser arguments (e.g., `--disable-dev-shm-usage`, `--disable-breakpad`, `--disable-threaded-animation`, `--disable-threaded-scrolling`, `--disable-checker-imaging`, `--disable-image-animation-resync`) to `DEFAULT_BROWSER_ARGS` forced a more synchronous main-thread execution model, reduced Chromium IPC overhead, and significantly improved overall DOM rendering performance.

Since all rendering is local (`file:///app/output/...`), Cross-Origin Resource Sharing (CORS) and site isolation checks add massive IPC overhead to V8, as Chromium spins up independent rendering processes and isolates layout boundaries unnecessarily.

`--single-process` forces Chromium to run the renderer, compositor, and browser process in a single OS process. This completely eliminates Chromium-internal IPC overhead between the browser process and the renderer process, which is a known major bottleneck in headless rendering, especially on CPU-bound VMs.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition (e.g., examples/simple-animation)
- **Render Settings**: 1280x720, 30fps, 5s (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.376s
- **Bottleneck analysis**: IPC latency between the Chromium browser process and the renderer processes, and context switching overhead on a CPU-bound VM.

## Implementation Spec

### Step 1: Add `--single-process` flag
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Add `--single-process` to the `DEFAULT_BROWSER_ARGS` array.

**Why**: By running Chromium in a single process, we eliminate all Chromium-internal Inter-Process Communication (IPC) overhead between the Browser process (which handles Playwright/CDP) and the Renderer process (which evaluates JS and paints the frames). On a CPU-bound microVM, context switching between these processes and serializing data over local sockets takes significant time.

**Risk**: `--single-process` is sometimes unstable in modern Chromium, but headless mode often supports it better than headed mode. If it crashes immediately, the experiment will be marked as failed.

## Variations

### Variation A: If `--single-process` fails, try `--in-process-gpu`
If `--single-process` crashes the browser, replace it with `--in-process-gpu`. This at least collapses the GPU process into the Browser process.

## Canvas Smoke Test
Run a canvas render test to ensure Canvas mode is unaffected.

## Correctness Check
Run the DOM benchmark. Ensure output video is correct.
