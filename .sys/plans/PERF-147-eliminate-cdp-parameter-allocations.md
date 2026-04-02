---
id: PERF-147
slug: eliminate-cdp-parameter-allocations
status: complete
claimed_by: "executor-session"
created: 2024-06-01
completed: ""
result: ""
---
# PERF-147: Eliminate CDP Parameter Object Allocations in TimeDrivers

## Focus Area
`packages/renderer/src/drivers/SeekTimeDriver.ts` and `packages/renderer/src/drivers/CdpTimeDriver.ts` inside the `setTime` hot loops.

## Background Research
In the `setTime` methods of the time drivers, CDP parameters are sent to Chromium via Playwright's `send()` or internal equivalents. Currently, these parameter objects are allocated as new object literals on every frame:
- `SeekTimeDriver`: `const params = { expression: ..., awaitPromise: true, returnByValue: false }`
- `CdpTimeDriver`: `{ policy: 'advance', budget: budget }`

In PERF-140, removing the `.then` closure and object pool improved performance because V8 GC handles small literal allocations well. However, we can completely eliminate these object allocations by maintaining a single pre-allocated class property and mutating its fields synchronously. Because Playwright's `CDPSession.send` method synchronously serializes the parameters to JSON before yielding to the event loop, mutating a shared parameter object per-frame is perfectly thread-safe in Node.js and avoids accumulating garbage on the heap.

## Benchmark Configuration
- **Composition URL**: `output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.5s
- **Bottleneck analysis**: Micro-allocations inside the Node-to-Chromium IPC hot loop. Eliminating them entirely reduces GC pressure.

## Implementation Spec

### Step 1: Pre-allocate evaluation params in `SeekTimeDriver.ts`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Add a private class property:
   ```typescript
   private evaluateParams = {
     expression: '',
     awaitPromise: true,
     returnByValue: false
   };
   ```
2. In `setTime()`, inside the `if (frames.length === 1)` block, remove the `const params = { ... }` allocation.
3. Mutate the shared object and pass it:
   ```typescript
   this.evaluateParams.expression = `window.__helios_seek(${timeInSeconds}, ${this.timeout})`;
   return this.cdpSession!.send('Runtime.evaluate', this.evaluateParams) as Promise<any>;
   ```
4. Apply the same logic to the multi-frame fallback block (for the main frame).

**Why**: Eliminates one object allocation per frame per worker.
**Risk**: None. Playwright serializes synchronously.

### Step 2: Pre-allocate virtual time policy params in `CdpTimeDriver.ts`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Add a private class property:
   ```typescript
   private virtualTimePolicyParams: any = {
     policy: 'advance',
     budget: 0
   };
   ```
2. In `setTime()`, replace the inline object allocation:
   ```typescript
   this.virtualTimePolicyParams.budget = budget;
   this.client!.send('Emulation.setVirtualTimePolicy', this.virtualTimePolicyParams).catch(reject);
   ```

**Why**: Eliminates object allocation for virtual time advancement.

## Variations
None.

## Correctness Check
Run the renderer benchmark script `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to verify the DOM rendering still succeeds and produces a valid output.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still works properly.
