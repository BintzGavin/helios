---
id: PERF-793
slug: bypass-settime-await
status: unclaimed
claimed_by: ""
created: 2024-06-18
completed: ""
result: ""
---

# PERF-793: Bypass Microtask Queue for DOM Mode Time Progression

## Focus Area
`CaptureLoop.ts` hot loops and `TimeDriver` interface.

## Background Research
In `dom` mode, `CdpTimeDriver.setTime` avoids executing `Emulation.setVirtualTimePolicy` because the `beginFrame` capture step automatically advances virtual time via its `interval` parameter (introduced in PERF-791). Currently, `setTime` returns a static `RESOLVED_PROMISE`.

However, in `CaptureLoop.ts`, the `await timeDriver.setTime(...)` statement is used unconditionally. In V8, evaluating `await` on an already resolved promise still yields execution, allocates a microtask, and resumes. This introduces completely unnecessary microtask queue overhead per frame in the DOM fast path (amounting to 150-300 microtasks per render job), interrupting the heavily optimized JIT monomorphism.

By modifying the `TimeDriver` interface to allow returning `void`, we can have `CdpTimeDriver.setTime` return `undefined` instead of a resolved promise in `dom` mode. Inside `CaptureLoop.ts`, we can conditionally await the result only if it is actually a promise. This allows the hot loop to bypass the microtask queue entirely.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.069s (baseline)
- **Bottleneck analysis**: The cost of V8 resolving microtasks within the async loops limits TurboFan optimization. Bypassing the `await` keyword completely eliminates the closure and scheduling overhead for time progression.

## Implementation Spec

### Step 1: Update TimeDriver Interface
**File**: `packages/renderer/src/drivers/TimeDriver.ts`
**What to change**:
Modify the `setTime` method signature to allow returning `void` alongside `Promise<void>`.
```typescript
export interface TimeDriver {
  init(page: Page, seed?: number): Promise<void>;
  setTime(page: Page, timeInSeconds: number): Promise<void> | void;
}
```
**Why**: Allows synchronous operations to safely skip promise allocation and `await` blocking.

### Step 2: Return void from CdpTimeDriver in DOM mode
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Update the return type signature for `setTime`:
```typescript
setTime(page: Page, timeInSeconds: number): Promise<void> | void {
```
Then, update the two places where `RESOLVED_PROMISE` is returned to simply return (void):
```typescript
    if (delta <= 0) {
        return; // Changed from: return RESOLVED_PROMISE;
    }
```
And:
```typescript
    if (this.mode === 'dom') {
      // DomStrategy's beginFrame will advance the virtual time via its 'interval' parameter
      return; // Changed from: return RESOLVED_PROMISE;
    }
```
**Why**: Avoids yielding a promise when virtual time progression is handled intrinsically by `beginFrame` and media sync is un-awaited.

### Step 3: Update SeekTimeDriver Interface Signature
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Update the return type of `setTime` to match the new `TimeDriver` interface. The implementation can still safely return promises as it currently does.
```typescript
  setTime(page: Page, timeInSeconds: number): Promise<void> | void {
```

### Step 4: Conditionally await timeDriver in CaptureLoop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In both the FAST PATH FOR SINGLE WORKER and FAST PATH FOR MULTI WORKER sections, locate the unconditional await:
```typescript
await timeDriver.setTime(page, (startFrame + i) * compTimeStep);
```
Replace it with a conditional await check:
```typescript
const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
if (timePromise) {
    await timePromise;
}
```
**Why**: In JavaScript, `await undefined` will still allocate a microtask wrapper. Explicitly skipping the `await` keyword via a conditional `if` branch prevents this, allowing V8 to proceed synchronously without queueing tasks.

## Variations
N/A

## Canvas Smoke Test
Run the `canvas` mode benchmark script (`npx tsx scripts/benchmark-perf.ts --mode canvas`) to verify `canvas` mode still correctly awaits the actual Promise returned by `CdpTimeDriver`.

## Correctness Check
Run the `dom` mode benchmark script (`npx tsx scripts/benchmark-perf.ts --mode dom`). Ensure the output renders frames properly and does not hang due to unsynchronized CDP queues.

## Prior Art
- PERF-694/PERF-695 (Bypass Capture Await) explored similar techniques but failed because the `strategy.capture` operation was inherently asynchronous. By targeting `setTime`—which is genuinely synchronous in DOM mode—we can safely achieve the performance benefit.
