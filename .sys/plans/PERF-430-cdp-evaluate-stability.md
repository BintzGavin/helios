---
id: PERF-430
slug: cdp-evaluate-stability
status: complete
claimed_by: ""
created: 2026-05-04
completed: ""
result: ""
---

# PERF-430: CDP evaluate Stability Return Optimization

## Focus Area
Optimize CDP evaluation commands (`Runtime.evaluate`) inside `SeekTimeDriver` and `CdpTimeDriver` by explicitly forcing `returnByValue: false` to minimize IPC deserialization overhead during execution tracking.

## Background Research
Playwright's `CDPSession.send('Runtime.evaluate')` triggers V8's evaluation path. When evaluating scripts that do not require complex values returned (such as `window.__helios_seek` which generally resolves to `void` or a `Promise<void>`, and `window.__helios_wait_until_stable`), V8 and the CDP serializer must still check the return structure. By explicitly passing `returnByValue: false` in the evaluation parameters, we instruct CDP not to attempt deep value serialization of the resulting Promise or object representations back to Node.js, reducing memory allocations and IPC payload sizes.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1280x720, 30fps, 3 seconds (90 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 1 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.48s
- **Bottleneck analysis**: IPC overhead and memory allocation during the `Runtime.evaluate` calls for time seeking and stability checks per frame.

## Implementation Spec

### Step 1: Add `returnByValue: false` to SeekTimeDriver
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the `multiFrameEvaluateParams` initialization block, add `returnByValue: false`:
```typescript
      this.multiFrameEvaluateParams[i] = {
        expression: "",
        contextId: this.executionContextIds[i],
        awaitPromise: true,
        returnByValue: false
      };
```
And add it to `singleFrameEvaluateParams`:
```typescript
  private singleFrameEvaluateParams: any = { expression: '', awaitPromise: true, returnByValue: false };
```

### Step 2: Add `returnByValue: false` to CdpTimeDriver
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Add it to the parameter objects:
```typescript
  private evaluateStabilityParams: any = { expression: "if (typeof window.__helios_wait_until_stable === 'function') window.__helios_wait_until_stable();", awaitPromise: true, returnByValue: false };
  private singleFrameSyncMediaParams: any = { expression: "", awaitPromise: false, returnByValue: false };
```
And within `runSetTime`'s `multiFrameSyncMediaParams` initialization:
```typescript
              this.multiFrameSyncMediaParams[i] = {
                expression: "",
                contextId: this.executionContextIds[i],
                awaitPromise: false,
                returnByValue: false
              };
```

**Why**: Explicitly passing `returnByValue: false` allows CDP to skip internal value serialization checks for fire-and-forget or pure-promise synchronization calls, squeezing out IPC latency.
**Risk**: Very low.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts`

## Correctness Check
Run the verification suite: `npx tsx tests/run-all.ts`
