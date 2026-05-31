---
id: PERF-639
slug: optimize-hot-loop-redundancies
status: unclaimed
claimed_by: ""
created: 2024-05-31
completed: ""
result: ""
---

# PERF-639: Remove Redundant Conditionals in Hot Loops

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` and `packages/renderer/src/drivers/CdpTimeDriver.ts`.

## Background Research
After several focused but rejected plans due to structural regressions or negligible impact, we target purely reductive micro-optimizations that eliminate redundant type checks and branching inside the hottest loop without altering the control flow logic.
1. **Unconditional Await in `CaptureLoop.ts`:**
The expression `strategy.capture()` in `CaptureLoop.ts` always returns a `Promise` in this renderer context, thus `if (captureResult instanceof Promise)` is redundant and can be removed to simplify V8 compilation.
2. **Remove Redundant `hasMedia` check in `CdpTimeDriver.ts`:**
In `runSetTime`, the check `if (this.syncMediaState === 1 && this.hasMedia)` is redundant because `syncMediaState` acts as a boolean indicator directly correlated with media presence context setup. Removing `syncMediaState` and simply relying on `this.hasMedia` avoids the bitwise check.
3. **Remove Unnecessary String Re-assignment in `CdpTimeDriver.ts`:**
`this.singleFrameSyncMediaParams.expression = "window.__helios_sync_media();";` is evaluated every frame despite the static nature of the expression string. Initializing it once avoids redundant string allocations.

These changes reduce branching and overhead inside the tightest loop.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/output/example-build/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames), mp4 libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.116s
- **Bottleneck analysis**: Microtask and Promise allocations, branch prediction overhead.

## Implementation Spec

### Step 1: Remove `instanceof Promise` in CaptureLoop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `runWorker`, replace:
```typescript
            if (captureResult instanceof Promise) {
                try {
                    const buffer = await captureResult;
                    frameBufferRing[ringIndex] = buffer;
                    frameReadyRing[ringIndex] = 1;
                } catch (e) {
                    fatalError = e;
                    aborted = true;
                    checkState();
                }
            } else {
                frameBufferRing[ringIndex] = captureResult;
                frameReadyRing[ringIndex] = 1;
            }
```
with:
```typescript
            try {
                const buffer = await captureResult;
                frameBufferRing[ringIndex] = buffer;
                frameReadyRing[ringIndex] = 1;
            } catch (e) {
                fatalError = e;
                aborted = true;
                checkState();
            }
```
**Why**: `captureResult` inherently returns a `Promise`. Eliminating the runtime check reduces execution branches in the hot loop.

### Step 2: Remove `syncMediaState` redundancy
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Remove `private syncMediaState: number = 0; // 0 = unknown, 1 = true, 2 = false`.
Remove `this.syncMediaState = this.hasMedia ? 1 : 2;` from the codebase.
In `runSetTime()`, change `if (this.syncMediaState === 1 && this.hasMedia)` to `if (this.hasMedia)`.
**Why**: Reduces property lookup and condition evaluation overhead in the time advancement hot loop.

### Step 3: Remove redundant expression assignment
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Update `private singleFrameSyncMediaParams: any = { expression: "", awaitPromise: false, returnByValue: false };` to `private singleFrameSyncMediaParams: any = { expression: "window.__helios_sync_media();", awaitPromise: false, returnByValue: false };`.
Remove `this.singleFrameSyncMediaParams.expression = "window.__helios_sync_media();";` from the `if (frames.length === 1)` branch in `defaultSyncMedia()`.
**Why**: The expression is static; assigning it each frame is wasteful memory operation.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-determinism.ts`.
