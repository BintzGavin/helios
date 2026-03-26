---
id: PERF-075
slug: cdp-time-driver-gc
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

**PERF-075: Optimize V8 IPC Array Allocation and Garbage Collection via String Concatenation in CdpTimeDriver.ts**

**Focus Area**
The Chromium Developer Protocol (CDP) Runtime.evaluate IPC connection during frame capture and clock virtualization. Specifically, CdpTimeDriver.ts uses .map(frame => frame.evaluate(...)) to evaluate media synchronization logic, which inherently allocates arrays (promises) and triggers microtask resolutions over the Node.js event loop on every time evaluation loop for every frame buffer. This causes continuous V8 garbage collection churn during large off-screen rendering runs where the virtual budget is explicitly advanced per-frame.

**Background Research**
The CdpTimeDriver.ts (used for Canvas/WebGL off-screen compositions) explicitly evaluates a mediaSyncScript string across all page frames using await Promise.all(frames.map(...)).
When processing animations sequentially (thousands of frames), mapping over Playwright's frame() array and returning an array of Promises allocates new arrays into memory on every loop, forcing V8 GC to aggressively clean up these short-lived objects.
As observed in SeekTimeDriver.ts optimizations (PERF-068, PERF-028), replacing standard high-level functional .map() operations with pre-allocated or localized for loops appending to dynamically scoped arrays drastically reduces microtask allocation and memory thrashing within the Playwright IPC loop.

**Benchmark Configuration**
- Composition URL: Standard canvas mode benchmark composition
- Render Settings: 1280x720, 30 FPS, 5 seconds duration
- Mode: canvas
- Metric: Peak memory and render time

**Implementation Spec**

**Step 1: Replace .map() allocation with a standard for loop**
**File**: packages/renderer/src/drivers/CdpTimeDriver.ts
**What to change**:
Locate the media synchronization evaluation logic that uses frames.map() and Promise.all() around line 67.
Refactor it into a localized for loop that avoids .map array allocation:
Initialize an empty array of Promise<void>[]. Iterate over the frames using a for loop. For each frame, call frame.evaluate(mediaSyncScript).catch(...) and push the resulting promise into the array. Finally, await Promise.all() on the new array.
**Why**: By explicitly initiating the localized Promise<void>[] and pushing evaluation routines via a for loop, we eliminate the inline array construction implicit to .map(). This marginally drops V8 IPC GC pressure when handling multiple frames at high concurrency.
**Risk**: Minimal. This simply expands standard array traversal explicitly.

**Correctness Check**
Run npx tsx packages/renderer/tests/verify-cdp-driver.ts and npx tsx packages/renderer/tests/verify-cdp-iframe-media-sync.ts (if applicable) to ensure media offsets in canvas mode sync properly without errors.
