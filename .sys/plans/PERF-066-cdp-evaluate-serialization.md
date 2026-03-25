---
id: PERF-066
slug: cdp-evaluate-serialization
status: unclaimed
claimed_by: ""
created: 2024-05-27
completed: ""
result: ""
---

# PERF-066: Eliminate V8 Object Serialization in CDP Evaluate

## Focus Area
The `setTime` execution loop in `packages/renderer/src/drivers/SeekTimeDriver.ts`. Specifically, the CDP command `Runtime.evaluate` used to trigger `window.__helios_seek` on the main frame. Disabling `returnByValue` will skip the expensive and unnecessary process of serializing the evaluation's return value (which is `undefined`) and transmitting it back to Node.js over the IPC boundary.

## Background Research
When Node.js communicates with headless Chromium via Playwright's CDP session, calling `Runtime.evaluate` with `returnByValue: true` instructs the V8 engine to serialize the returned JavaScript object into JSON before sending it back across the IPC pipe. `window.__helios_seek` performs synchronous DOM operations and explicitly returns nothing (`undefined`). Therefore, retaining the default (or true) `returnByValue` incurs micro-latency per frame by pointlessly spinning up V8 serialization routines for an empty result. Prior experiments (`PERF-049` and `PERF-050`) have successfully proven that minimizing IPC chat by removing implicit returns or turning off `returnByValue` trims rendering latency for high-throughput frame loops.

## Benchmark Configuration
- **Composition URL**: `file://packages/renderer/scripts/fixtures/index.html` (or standard test fixture)
- **Render Settings**: 1280x720, 30 FPS, 3 seconds duration, `libx264` codec.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 32.100s
- **Bottleneck analysis**: Micro-latency accumulating from V8 IPC object serialization over thousands of frames in the active CDP pipeline.

## Implementation Spec

### Step 1: Disable `returnByValue` in CDP `Runtime.evaluate`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Locate the `setTime(page: Page, timeInSeconds: number)` method. Look for the `this.cdpSession.send('Runtime.evaluate', ...)` call. Ensure the parameters object explicitly sets `returnByValue: false`.
**Why**: Tells Chromium's V8 engine to skip JSON serialization of the execution result, returning only a lightweight RemoteObjectId (or nothing), saving CPU cycles and IPC bandwidth for every single frame capture cycle.
**Risk**: Low. The renderer does not capture or utilize the returned value of `__helios_seek` (only checking for `exceptionDetails`).

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/render.ts` with canvas mode settings. This change strictly modifies the `SeekTimeDriver` used for DOM rendering, so canvas behavior remains unaffected.

## Correctness Check
Run the DOM synchronization tests:
`npx tsx packages/renderer/tests/verify-seek-driver-offsets.ts`
Confirm the script outputs `SUCCESS: SeekTimeDriver respects offsets and seeks.` Ensure `__helios_seek` still accurately updates the DOM states without failure.

## Prior Art
- PERF-049: Disabled `returnByValue` to skip object serialization over CDP IPC.
- PERF-050: Changed `frame.evaluate` in `SeekTimeDriver.ts` to implicitly return `undefined`.
