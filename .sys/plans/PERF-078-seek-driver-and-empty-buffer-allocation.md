---
id: PERF-078
slug: seek-driver-and-empty-buffer-allocation
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

**PERF-078: Eliminate array allocations and buffer object instantiation in DOM frame capture**

**Focus Area**
Garbage Collection overhead and continuous memory allocations inside the hot frame capture loop, specifically within the `DomStrategy` capture path and the `SeekTimeDriver` synchronization step.

**Background Research**
Currently, when `HeadlessExperimental.beginFrame` returns without a `screenshotData` payload (e.g. no visual damage detected on the first frame or when falling back from an omitted frame), `DomStrategy.ts` instantiates a new Node.js `Buffer.from(..., 'base64')` per frame. In the context of thousands of frames, repeatedly decoding this base64 string into a new `Buffer` object contributes to V8 GC churn. Additionally, in `SeekTimeDriver.ts`, we iterate over the page's frames and push Promises to a newly initialized array, finally returning a `Promise.all` resolution. Since the overwhelming majority of renders are single-frame (just the main frame), avoiding the array allocation and `Promise.all` machinery completely can reduce latency per frame loop execution.

**Benchmark Configuration**
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: width 1280, height 720, 30fps, 5 seconds duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

**Baseline**
- **Current estimated render time**: ~33.594s
- **Bottleneck analysis**: Continuous memory allocation in the microtask queue and object serialization layer between Playwright CDP calls.

**Implementation Spec**

**Step 1: Hoist EMPTY_IMAGE_BUFFER in DomStrategy.ts**
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**: Replace all occurrences of dynamic base64 Buffer decoding (e.g. when `screenshotData` is returned from `beginFrame` or empty image fallbacks) that can be hoisted. `EMPTY_IMAGE_BUFFER` is already present at the top level of the file. Ensure that empty fallback conditions directly use the existing `EMPTY_IMAGE_BUFFER` instead of redundantly defining empty image variables or instantiating new Buffers inside the hot path of the capture method.
**Why**: Allocates the base64-decoded Buffer only once per process instead of once per omitted frame, reducing GC churn in the hot loop.
**Risk**: Negligible. Buffers are passed as references and FFmpeg stream piping handles reads safely.

**Step 2: Avoid Promise.all array allocations for single frames in SeekTimeDriver.ts**
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**: Inside the time sync method (where we iterate over frames length), check if the length of the frames collection is exactly `1`. If true, directly execute and await the relevant logic for the main frame (either via the CDP session or frame evaluation) instead of wrapping it in an array and using `Promise.all`. For the fallback case, instantiate the array with a fixed size based on the frames collection length and assign to indices.
**Why**: Avoids creating an array object and invoking V8's `Promise.all` logic for >99% of render cycles, decreasing microtask latency.
**Risk**: If the `length` logic is incorrect, multiple frames may not sync appropriately. Using fixed size array allocation ensures we don't accidentally allocate out of bounds.

**Canvas Smoke Test**
Run the standard canvas example render to verify that no core rendering behaviors are broken.

**Correctness Check**
Verify that `npx tsx packages/renderer/tests/fixtures/benchmark.ts` successfully completes and generates an MP4 file with the correct number of frames without throwing errors related to `Buffer` reference mismatches.
