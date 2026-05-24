---
id: PERF-506
slug: single-playwright-page
status: complete
claimed_by: ""
created: 2024-05-15
completed: ""
result: "discard"
---

# PERF-506: Implement Single Playwright Page Instance

## Focus Area
The `BrowserPool.ts` handles browser instance initialization. By default, it allocates a number of instances matching the microVM's CPU count. Each page requires IPC channels, parsing, and context-switching overhead inside Chromium.

## Background Research
For purely single-threaded DOM capturing paths utilizing a single browser process, thread contention and synchronization between different isolated contexts actually degrade performance (as seen in PERF-505) compared to maximizing single-core IPC throughput. Given the multi-processing overhead, restricting the process strictly to one unified Playwright page instance may cut the noise and boost maximum throughput per cycle, as we eliminate Chrome tab process overhead.

## Benchmark Configuration
- **Composition URL**: standard dom benchmark composition
- **Render Settings**: 1920x1080, 60fps, 10s, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~17.6s
- **Bottleneck analysis**: IPC overhead and page/process allocation context switching.

## Implementation Spec

### Step 1: Force Concurrency to 1
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**: Change `const concurrency = Math.max(1, (os.cpus().length || 4) - 1);` to `const concurrency = 1;`.
**Why**: Avoid multi-process IPC/context-switch overhead in the Playwright pool.
**Risk**: Might bottleneck if capture pipeline is highly parallelizable, though previous experiments (e.g. PERF-505) suggest concurrency adds overhead.

## Variations
None.

## Canvas Smoke Test
Ensure Canvas mode still launches and successfully captures.

## Correctness Check
Run the DOM benchmark and inspect `test-output.mp4` to ensure all frames are encoded correctly.