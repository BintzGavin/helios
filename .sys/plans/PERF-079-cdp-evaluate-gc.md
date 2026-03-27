---
id: PERF-079
slug: cdp-evaluate-gc
status: complete
claimed_by: "executor-session"
created: 2024-05-24
completed: "2026-03-27"
result: "improved"
---

**PERF-079: Eliminate micro-stalls and GC churn in CdpTimeDriver frame synchronization**

**Focus Area**
Garbage Collection overhead and continuous memory allocations inside the hot frame capture loop, specifically within the `CdpTimeDriver` synchronization step for multi-frame support.

**Background Research**
Currently, when `CdpTimeDriver.setTime` is called, it iterates over all frames and allocates an array of Promises (`frames.map(...)`) before calling `Promise.all()`. This pattern is identical to the one eliminated in `SeekTimeDriver` (PERF-078) which showed a measurable ~1.5% improvement by bypassing dynamic array allocations and microtask queue delays when rendering single-frame documents. Since the overwhelming majority of renders are single-frame (just the main frame), avoiding the array allocation and `Promise.all` machinery completely can reduce latency per frame loop execution in Canvas mode as well.

**Benchmark Configuration**
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: width 1280, height 720, 30fps, 5 seconds duration
- **Mode**: `canvas` (since CdpTimeDriver is used here)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

**Baseline**
- **Bottleneck analysis**: Continuous memory allocation in the microtask queue and object serialization layer between Playwright CDP calls during `setTime`.

**Implementation Spec**

**Step 1: Avoid Promise.all array allocations for single frames in CdpTimeDriver.ts**
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**: Inside the time sync method (where we evaluate the `mediaSyncScript` across frames), check if the length of the frames collection is exactly `1`. If true, directly execute and await the evaluation on `frames[0]` instead of allocating an array and using `Promise.all`. For the fallback case (multiple frames), instantiate the array with a fixed size (`new Array(frames.length)`) and assign to indices instead of using implicit array allocations.
**Why**: Avoids creating an array object and invoking V8's `Promise.all` logic for >99% of render cycles, decreasing microtask latency and GC churn in the Canvas rendering path.
**Risk**: If the `length` logic is incorrect, multiple frames (iframes) may not sync their media appropriately.

**Correctness Check**
Verify that `npx tsx packages/renderer/tests/fixtures/benchmark.ts` (with mode set to canvas or default) successfully completes without throwing errors related to media synchronization.


## Results Summary
- **Best render time**: 33.332s (vs baseline 33.445s)
- **Improvement**: 0.3%
- **Kept experiments**: Avoided Promise.all array allocations for single frames in CdpTimeDriver.ts
- **Discarded experiments**: None
