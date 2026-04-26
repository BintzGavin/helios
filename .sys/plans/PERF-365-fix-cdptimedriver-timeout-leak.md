---
id: PERF-365
slug: fix-cdptimedriver-timeout-leak
status: unclaimed
claimed_by: ""
created: 2024-04-26
completed: ""
result: ""
---

# PERF-365: Avoid Promise.race allocation in CdpTimeDriver stability check

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts` - `setTime` single-frame path (stability check).

## Background Research
Currently, `CdpTimeDriver.ts` uses `Promise.race([evaluatePromise, timeoutPromise])` to apply a timeout to the `Runtime.evaluate` CDP call for stability checks.
Every frame, this allocates a new array for the promises, the `timeoutPromise` itself, and relies on `Promise.race` internal allocations.
While `PERF-362` proved that replacing `Promise.race` in the browser context (`SeekTimeDriver` injected script) yielded no measurable improvement due to Chromium's efficient isolated V8 GC, `CdpTimeDriver` executes in the Node.js context. In the Node.js context, the event loop and GC are under significantly more pressure from CDP IPC handling, Playwright, and FFmpeg streams. Eliminating `Promise.race` and the explicit `timeoutPromise` wrapper in favor of a single manual Promise can reduce GC churn in the Node.js process and potentially improve stability check throughput.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10 duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~46.298s
- **Bottleneck analysis**: Micro-allocation of `Promise.race` arrays and redundant `timeoutPromise` objects inside the Node.js hot loop on every frame.

## Implementation Spec

### Step 1: Optimize `Promise.race` to a single Promise
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In `setTime()`, locate the stability check execution block:
```typescript
<<<<<<< SEARCH
    const evaluatePromise = this.client!.send('Runtime.evaluate', this.evaluateStabilityParams).then(this.handleStabilityCheckResponse);

    const timeoutPromise = new Promise<void>(this.stabilityTimeoutExecutor);

    try {
        await Promise.race([evaluatePromise, timeoutPromise]);
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
=======
    await new Promise<void>((resolve, reject) => {
        let isDone = false;

        const timeoutId = setTimeout(() => {
            if (isDone) return;
            isDone = true;
            console.warn(`[CdpTimeDriver] Stability check timed out after ${this.timeout}ms. Terminating execution.`);
            this.client?.send('Runtime.terminateExecution').catch((termErr) => {
                console.warn('[CdpTimeDriver] Failed to terminate hanging script:', termErr);
            });
            // We resolve rather than reject to allow rendering to continue, as timeout implies we gave up waiting
            resolve();
        }, this.timeout);

        this.client!.send('Runtime.evaluate', this.evaluateStabilityParams)
            .then((res) => {
                if (isDone) return;
                isDone = true;
                clearTimeout(timeoutId);
                try {
                    this.handleStabilityCheckResponse(res);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            })
            .catch((err) => {
                if (isDone) return;
                isDone = true;
                clearTimeout(timeoutId);
                reject(err);
            });
    });
>>>>>>> REPLACE
```

Also, remove the `stabilityTimeoutCallback`, `stabilityTimeoutExecutor`, `stabilityTimeoutId`, and `stabilityTimeoutReject` class properties since they are no longer needed.

**Why**: Avoids `Promise.race` and the creation of an intermediate `timeoutPromise` and array wrapper in the Node.js event loop.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` from the `packages/renderer` directory.

## Correctness Check
Run `npx tsx tests/verify-dom-strategy-capture.ts` from the `packages/renderer` directory.
Run the DOM render benchmark script multiple times to verify median render time improvement.

## Prior Art
- **PERF-362**: Attempted similar optimization in browser context, discarded.
- **PERF-343**: Attempted to prebind executors for this exact block to avoid closure allocation.
