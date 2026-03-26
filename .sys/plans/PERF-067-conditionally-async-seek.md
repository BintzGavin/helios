---
id: PERF-067
slug: conditionally-async-seek
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-067: Bypass V8 Microtask Queue in SeekTimeDriver

## Focus Area
The `window.__helios_seek` function injected by `packages/renderer/src/drivers/SeekTimeDriver.ts`. This script executes on every frame via CDP `Runtime.evaluate`.

## Background Research
Currently, the `__helios_seek` initialization script defines the function with an `async` keyword: `window.__helios_seek = async (t, timeoutMs) => { ... }`. Even though we recently optimized the CDP call to use `returnByValue: false` to avoid serializing the *result*, the `async` keyword forces V8 to allocate a native Promise and schedule its resolution on the microtask queue for every invocation, regardless of whether any internal asynchronous waits (`await`) actually occurred during execution.

Given that the vast majority of frames do not encounter fonts loading or media elements seeking, `promises.length` is usually 0, meaning no internal await happens. By removing the `async` keyword from the function signature and instead conditionally returning a Promise *only* when `promises.length > 0`, we can eliminate the unnecessary microtask overhead for fast-path frames.

## Benchmark Configuration
- **Composition URL**: Standard benchmark HTML
- **Render Settings**: Standard resolution and framerate
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.100s
- **Bottleneck analysis**: The microtask queue overhead in Chromium V8 for evaluating a native async function on every frame via IPC adds unnecessary latency when no actual asynchronous work is performed.

## Implementation Spec

### Step 1: Remove Async Wrapper
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the `initScript` string:
1. Change `window.__helios_seek = async (t, timeoutMs) => {` to `window.__helios_seek = (t, timeoutMs) => {`.
2. Locate the stability wait block (`if (promises.length > 0) { ... }`).
3. Replace the `await Promise.race(...)` logic by returning a new Promise that encapsulates the race and subsequent GSAP/Helios re-seeks. Example structure:
   ```javascript
   if (promises.length > 0) {
     return new Promise((resolve) => {
       let timeoutId;
       const allReady = Promise.all(promises);
       const timeoutPromise = new Promise((res) => {
         timeoutId = setTimeout(res, timeoutMs);
       });
       Promise.race([allReady, timeoutPromise]).then(() => {
         clearTimeout(timeoutId);
         // ... (existing GSAP/Helios secondary seeks) ...
         resolve();
       });
     });
   }
   ```
**Why**: This allows fast-path executions (no promises) to run fully synchronously and return `undefined` immediately, avoiding the V8 Promise allocation and microtask queue scheduling entirely.

## Correctness Check
Instruct the Executor to run the offset verification tests (`npx tsx packages/renderer/tests/verify-seek-driver-offsets.ts`) to ensure time synchronization is not broken, particularly for frames that *do* require waiting.
