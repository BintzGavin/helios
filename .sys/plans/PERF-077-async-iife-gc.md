---
id: PERF-077
slug: async-iife-gc
status: complete
claimed_by: "executor-session"
created: 2024-05-24
completed: "2026-03-27"
result: "no-improvement"
---

**PERF-077: Optimize GC pressure by wrapping Playwright CDP interactions in an async IIFE**

**Focus Area**
The frame capture loop in `packages/renderer/src/Renderer.ts` relies on `.then().catch()` chains combined with `events.once()` inside a `while` loop when FFmpeg stream writes indicate backpressure. Transitioning these nested promise closures to `async`/`await` IIFEs minimizes Promise allocations and reduces V8 garbage collection micro-stalls during high-throughput DOM capture.

**Background Research**
In hot rendering paths, particularly in V8 under Playwright IPC backpressure, allocating new `.then` and `.catch` closures for every frame results in continuous GC churn. Wrapping asynchronous sequences in an `async` IIFE instead of using `.then()` Promise chains reduces memory allocations and mitigates V8 Garbage Collection pressure per frame.

**Benchmark Configuration**
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1920x1080, 60 FPS, 5 seconds duration
- **Mode**: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

**Baseline**
- **Current estimated render time**: 33.594s
- **Bottleneck analysis**: Continuous allocation of Promises during stream `drain`/`close` events inside `Renderer.ts`'s `captureLoop`.

**Implementation Spec**

**Step 1: Convert events.once backpressure chain to async IIFE**
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
In the `captureLoop`, locate the `events.once()` calls that are chained with `.then().catch()` when assigning `previousWritePromise` and when finalizing the render loop. Replace the `.then()` and `.catch()` chains with an `async` IIFE that uses `try`/`catch`/`finally`. The `finally` block should remove the listeners.
**Why**: Using an `async` IIFE with `try`/`catch`/`finally` avoids allocating multiple closure objects for `.then` and `.catch` per frame when the FFmpeg pipe experiences backpressure, mitigating V8 Garbage Collection pressure and micro-stalls.
**Risk**: Proper error propagation relies on the `catch` block correctly throwing the `ac.signal.reason` on an `AbortError`.

**Canvas Smoke Test**
Run a standard canvas composition test to ensure no errors are thrown during encoding.

**Correctness Check**
Run `npx tsx packages/renderer/tests/verify-seek-driver-stability.ts` to ensure output frame count and stability are unchanged.

## Results Summary
- **Best render time**: 33.499s (vs baseline 33.452s)
- **Improvement**: 0%
- **Kept experiments**: None
- **Discarded experiments**: Wrapped events.once backpressure chain in an async IIFE
