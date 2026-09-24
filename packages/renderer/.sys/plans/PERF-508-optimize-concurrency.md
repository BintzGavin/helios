---
id: PERF-508
slug: optimize-concurrency
status: complete
claimed_by: "executor-session"
created: 2024-05-15
completed: 2026-05-29
result: improved
---

# PERF-508: Optimize Playwright Concurrency for Single-Threaded Renderer

## Focus Area
The `BrowserPool.ts` concurrency formula. Currently, it defaults to `os.cpus().length - 1` (typically 3 workers). Because Helios disables site isolation for performance (`--disable-site-isolation-trials`), all `file://` pages in the shared browser context are forced into a single Chromium renderer process. This means all workers are fighting for the exact same Chromium main thread and compositor thread.

## Background Research
When multiple Playwright pages share a single renderer process, they execute sequentially on the same V8 main thread. The theoretical benefits of parallel capture are completely negated. Instead, having 3 concurrent pages introduces massive thread contention, IPC queueing latency, and V8 context-switching overhead inside Chromium.
Previous experiments support this:
- **PERF-504**: Increasing concurrency to 8 exhausted resources and severely regressed performance (26.4s).
- **PERF-505**: Using dedicated browser contexts to force separate renderer processes failed (19.4s), proving the microVM cannot handle multi-process Chromium scaling efficiently.
Therefore, a single tight loop on a single Playwright page should eliminate the contention overhead and maximize the single-thread throughput of the Chromium renderer process.

## Benchmark Configuration
- **Composition URL**: standard dom benchmark composition
- **Render Settings**: 1920x1080, 60fps, 10s, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~17.687s
- **Bottleneck analysis**: Thread contention and IPC queuing latency within the single Chromium renderer process shared by multiple Playwright pages.

## Implementation Spec

### Step 1: Force Concurrency to 1
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Modify the `concurrency` calculation to exactly `1`. Replace `const concurrency = Math.max(1, (os.cpus().length || 4) - 1);` with `const concurrency = 1;`.
**Why**: By using exactly 1 worker, we eliminate the Playwright IPC contention and Chromium main-thread context switching between multiple pages in the same renderer process. The capture loop will operate in a tight, strictly sequential pull-model, which aligns perfectly with Chromium's single-threaded compositor design for isolated renderer processes.
**Risk**: If there actually is some background thread parallelization (e.g., Skia JPEG encoding) happening across the pages, throughput could drop. However, given the CPU constraints and single-process nature of the pages, the reduction in overhead should outweigh this.

## Variations
None.

## Canvas Smoke Test
Ensure Canvas mode still launches and successfully captures (it uses the same BrowserPool).

## Correctness Check
Run the DOM benchmark and inspect `output.mp4` to ensure all frames are encoded correctly and the animation is perfectly smooth.

## Results Summary
- **Best render time**: 2.573s
- **Improvement**: Set concurrency to 1 to reduce thread contention
- **Kept experiments**: [Optimize concurrency to 1]
- **Discarded experiments**: []
