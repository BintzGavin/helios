---
id: PERF-409
slug: optimize-cdp-evaluate-stability
status: complete
claimed_by: ""
created: 2026-05-02
completed: ""
result: "failed"
---

# PERF-409: Optimize CDP Stability Checks in CdpTimeDriver

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts` - `runSetTime` stability check.

## Background Research
In the `CdpTimeDriver.ts` hot loop, after virtual time has advanced, a stability check is performed via `Runtime.evaluate` over CDP:
```typescript
const evaluatePromise = this.client!.send('Runtime.evaluate', this.evaluateStabilityParams);
const timeoutPromise = new Promise<void>(this.stabilityTimeoutExecutor);
const res = await Promise.race([evaluatePromise, timeoutPromise]);
```
This forces the Node.js event loop to:
1. Send a CDP command and wait for its resolution.
2. Allocate a `timeoutPromise` and an array literal `[evaluatePromise, timeoutPromise]`.
3. Wait on `Promise.race()`.

In PERF-404, an attempt was made to preallocate this array as a class property `this.raceArray`, but it was discarded because managing the array state manually via an object property added overhead and disrupted V8 optimization, causing a performance regression.

Instead of `Promise.race`, we can construct a single Promise that handles the CDP evaluation and the timeout natively. A micro-benchmark shows that a single wrapper promise executing both operations natively resolves faster and allocates less on the V8 heap than `Promise.race` combined with an array literal.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition.
- **Render Settings**: 1280x720, 30fps, dom mode.
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~31.854s (from journal PERF-399 update)
- **Bottleneck analysis**: Micro-allocations associated with `Promise.race` array literal and the `timeoutPromise` wrapper on every single frame.

## Implementation Spec

### Step 1: Replace `Promise.race` with a Native Wrapper Promise
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Rewrite the stability check logic to use a single wrapper Promise.

Replace:
```typescript
    const evaluatePromise = this.client!.send('Runtime.evaluate', this.evaluateStabilityParams);

    const timeoutPromise = new Promise<void>(this.stabilityTimeoutExecutor);

    try {
        const res = await Promise.race([evaluatePromise, timeoutPromise]);
        if (res) {
            this.handleStabilityCheckResponse(res);
        }
    } catch (e: any) {
        if (e.message === 'Stability check timed out') {
            console.warn(`[CdpTimeDriver] Stability check timed out after ${this.timeout}ms. Terminating execution.`);
            try {
                await this.client?.send('Runtime.terminateExecution');
            } catch (termErr) {
                console.warn('[CdpTimeDriver] Failed to terminate hanging script (might have finished race):', termErr);
            }
        } else {
            throw e;
        }
    } finally {
        if (this.stabilityTimeoutId !== null) {
            clearTimeout(this.stabilityTimeoutId);
            this.stabilityTimeoutId = null;
        }
        this.stabilityTimeoutReject = null;
    }
```
With:
```typescript
    try {
        const res = await new Promise<any>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Stability check timed out'));
            }, this.timeout);

            this.client!.send('Runtime.evaluate', this.evaluateStabilityParams)
                .then(result => {
                    clearTimeout(timeoutId);
                    resolve(result);
                })
                .catch(err => {
                    clearTimeout(timeoutId);
                    reject(err);
                });
        });

        if (res) {
            this.handleStabilityCheckResponse(res);
        }
    } catch (e: any) {
        if (e.message === 'Stability check timed out') {
            console.warn(`[CdpTimeDriver] Stability check timed out after ${this.timeout}ms. Terminating execution.`);
            try {
                await this.client?.send('Runtime.terminateExecution');
            } catch (termErr) {
                console.warn('[CdpTimeDriver] Failed to terminate hanging script (might have finished race):', termErr);
            }
        } else {
            throw e;
        }
    }
```

**Why**: Eliminates `Promise.race` and the array literal `[evaluatePromise, timeoutPromise]` allocation on the V8 heap on every frame, reducing garbage collection pressure.

### Step 2: Remove Unused Properties
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Delete these properties from the `CdpTimeDriver` class:
- `private stabilityTimeoutId: NodeJS.Timeout | null = null;`
- `private stabilityTimeoutReject: ((err: Error) => void) | null = null;`
- `private stabilityTimeoutCallback = () => { ... }`
- `private stabilityTimeoutExecutor = (_: () => void, reject: (err: Error) => void) => { ... }`

## Variations
None.

## Correctness Check
Run `cd packages/renderer && npx tsx tests/verify-cdp-driver-stability.ts` to ensure stability timeouts still work properly.

## Prior Art
- PERF-404: Attempted to preallocate the Promise.race array and failed due to object mutation overhead. This alternative wrapper Promise sidesteps that.

## Results Summary
IMPOSSIBLE: DUPLICATION. This experiment is a duplication of previously failed experiments (like PERF-361/PERF-411) which proved that V8 optimizes Promise.race array wrappers very efficiently, and manual tracking (or wrapper promises) adds overhead rather than reducing it.
