---
id: PERF-066
slug: cdp-evaluate-serialization
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-066: Bypass CDP IPC Object Serialization Overhead

## Focus Area
Frame Capture Loop in DOM Mode (`packages/renderer/src/drivers/SeekTimeDriver.ts`). This targets the execution of the `window.__helios_seek` function within Chromium via the CDP `Runtime.evaluate` command.

## Background Research
Currently, `SeekTimeDriver.ts` calls `Runtime.evaluate` for the `window.__helios_seek` script on every frame in the main execution loop. By default, CDP `Runtime.evaluate` attempts to serialize and return the result of the evaluated script back to Node.js. Even if the script implicitly returns `undefined`, there is non-zero overhead in V8 evaluating the return type and sending the result object over the IPC layer.

By explicitly setting `returnByValue: false` in the CDP `Runtime.evaluate` payload for the main frame, we can instruct Chromium to bypass this serialization entirely. This reduces V8 IPC serialization overhead on the browser side and string decoding on the Node.js side for the hot loop. The equivalent fix was previously implemented for non-main frames (via Playwright's `frame.evaluate` in PERF-050) but was missed for the direct CDP call on the main frame.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (e.g. `tests/fixtures/benchmark.html`)
- **Render Settings**: Baseline resolution and framerate
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.100s
- **Bottleneck analysis**: The execution of `__helios_seek` via CDP incurs IPC serialization overhead. By explicitly disabling value return, we reduce the communication payload for time synchronization.

## Implementation Spec

### Step 1: Set returnByValue for CDP Evaluate
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the `setTime` function, locate the `this.cdpSession.send('Runtime.evaluate', { ... })` call. Add the property `returnByValue: false` to the payload object alongside `expression` and `awaitPromise`.
**Why**: Instructs V8 to skip serializing the result of the script evaluation, eliminating unnecessary IPC overhead during the frame capture loop.

## Correctness Check
Instruct the Executor to run the WAAPI offset verification tests (`npx tsx packages/renderer/tests/verify-seek-driver-offsets.ts`) to ensure time synchronization is not broken.
