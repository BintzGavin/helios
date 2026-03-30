---
id: PERF-110
slug: sequential-cdp-capture
status: unclaimed
claimed_by: ""
created: 2024-05-30
completed: ""
result: ""
---

# PERF-110: Sequential CDP Capture (Concurrency = 1)

## Focus Area
Frame Capture Loop in `packages/renderer/src/Renderer.ts`.

## Background Research
Currently, the renderer tries to over-subscribe the CPU with parallel worker pages. This adds significant memory footprint, V8 context-switching overhead, and IPC queuing delays in CPU-constrained microVM environments with no hardware acceleration.
By using a *single* worker page (`concurrency = 1`), we can eliminate the IPC overhead of broadcasting multiple CDP commands across isolated contexts, avoid parallel Playwright object allocations, and reduce total memory load per frame capture.
We will still pipeline FFmpeg encoding with capture by rapidly sending `beginFrame` commands to the single page sequentially and relying on Chromium's internal compositor thread decoupling to return screenshots asynchronously.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 33.394s (based on last best run in RENDERER-EXPERIMENTS.md)
- **Bottleneck analysis**: IPC overhead, context switching between multiple Playwright worker pages, and duplicated V8 execution memory within the microVM.

## Implementation Spec

### Step 1: Change concurrency to 1 in Renderer.ts
**File**: `packages/renderer/src/Renderer.ts`
**What to change**: Change `const concurrency = Math.min(Math.ceil(cpus * 1.5), 8);` to `const concurrency = 1;`
**Why**: This reduces the number of Playwright pages to 1, removing the memory and CPU contention of maintaining multiple Blink renderers in a CPU-bound microVM.
**Risk**: If Playwright/Chromium cannot pipeline sequential CDP `beginFrame` commands efficiently, frame capture will become purely sequential and may slow down rendering.

### Step 2: Remove active pipeline depth limit in the capture loop
**File**: `packages/renderer/src/Renderer.ts`
**What to change**: Change `const maxPipelineDepth = poolLen * 10;` to a static larger value like `50`, or remove the limit entirely to maximize Node's async promise firing for the single page.
**Why**: We want to slam the single page's CDP queue with as many `beginFrame` and `setTime` commands as possible so Chromium can optimize execution asynchronously.
**Risk**: May cause out-of-memory errors if too many base64 buffers are held in memory before FFmpeg can write them.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/fixtures/benchmark.ts`.

## Correctness Check
Run the `npx tsx packages/renderer/tests/fixtures/benchmark.ts` test or check the output video visually.
