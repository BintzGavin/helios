---
id: PERF-099
slug: disable-threaded-animations
status: unclaimed
claimed_by: ""
created: 2024-05-25
completed: ""
result: ""
---

# PERF-099: Disable Threaded Animations and Scrolling in Chromium

## Focus Area
Chromium Engine - Layout/Paint Synchronization Overhead

## Background Research
In a headless, CPU-bound, deterministic rendering environment where animations and time are manually advanced frame-by-frame, Chromium's multi-threaded architecture for compositing and animations (e.g., compositor thread vs. main thread) can introduce unnecessary IPC synchronization and thread-hopping overhead. By passing flags such as `--disable-threaded-animation`, `--disable-threaded-scrolling`, `--disable-checker-imaging`, and `--disable-image-animation-resync`, we force the engine into a more synchronous execution model on the main thread. This might align better with our explicit `HeadlessExperimental.beginFrame` layout/paint ticks and reduce micro-stalls per frame capture.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition.
- **Render Settings**: Standard benchmark settings (must be identical across all runs).
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.376s
- **Bottleneck analysis**: Micro-stalls during frame layout, paint, and CDP frame captures.

## Implementation Spec

### Step 1: Add experimental Chromium flags
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Add the following strings to the `DEFAULT_BROWSER_ARGS` array:
- `'--disable-threaded-animation'`
- `'--disable-threaded-scrolling'`
- `'--disable-checker-imaging'`
- `'--disable-image-animation-resync'`
**Why**: Forces synchronous main-thread execution for these subsystems, potentially reducing IPC wait times during manual layout/paint cycles.

## Canvas Smoke Test
Run a standard canvas render to ensure nothing breaks.

## Correctness Check
Run the DOM render verify scripts. Watch the generated video output to ensure the frames are still correctly rendered and visual quality remains acceptable.
