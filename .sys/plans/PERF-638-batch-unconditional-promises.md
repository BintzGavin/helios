---
id: PERF-638
slug: batch-unconditional-promises
status: unclaimed
claimed_by: ""
created: 2024-05-31
completed: ""
result: ""
---

# PERF-638: Batch Micro-Optimizations in Hot Loop

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` and `packages/renderer/src/drivers/CdpTimeDriver.ts`.

## Background Research
After several focused but rejected plans due to structural regressions (like PERF-631 which grouped too many changes), we need a tightly grouped set of micro-optimizations that *only* eliminate redundant type checks, function allocations, and branching inside the hottest loop, without changing the control flow structure.

1. **Unconditional Await in `CaptureLoop.ts`:**
The expression `strategy.capture()` inherently returns a `Promise`. Thus, checking `if (captureResult instanceof Promise)` is always `true`. Removing this check and the `else` block simplifies V8 compilation.

2. **Bypass `Promise.resolve()` allocation in `CdpTimeDriver.ts`:**
When time does not advance (`delta <= 0`), returning `Promise.resolve()` allocates a microtask wrapper. Changing `return Promise.resolve();` to `return;` is safe since the interface allows returning `void`.

3. **Remove Redundant `hasMedia` check in `CdpTimeDriver.ts`:**
`syncMediaState` is `1` if and only if `hasMedia` is true. The condition `if (this.syncMediaState === 1 && this.hasMedia)` is completely redundant and can be simplified to `if (this.hasMedia)`.

4. **Remove Unnecessary String Re-assignment in `CdpTimeDriver.ts`:**
`this.singleFrameSyncMediaParams.expression` is reassigned every frame despite being completely static.

These changes are individually safe, purely reductive (deleting code), and target the exact same GC/branching bottleneck inside the tightest loop.

## Benchmark Configuration
- **Composition URL**: file:///app/examples/dom-benchmark/output/example-build/composition.html
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames), mp4 libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.863s
- **Bottleneck analysis**: Microtask and Promise allocations.

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
                frameBufferRing[ringIndex] = captureResult as any;
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

### Step 2: Return void instead of Promise.resolve()
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Change `runSetTime` return type to `Promise<void> | void`.
Inside `runSetTime`, change `return Promise.resolve();` to `return;`.

### Step 3: Remove `syncMediaState`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Remove `private syncMediaState: number = 0;` and its assignment in `prepare()`.
In `runSetTime()`, change `if (this.syncMediaState === 1 && this.hasMedia)` to `if (this.hasMedia)`.

### Step 4: Remove expression assignment
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Initialize `singleFrameSyncMediaParams` as `{ expression: "window.__helios_sync_media();", awaitPromise: false, returnByValue: false }`.
Remove `this.singleFrameSyncMediaParams.expression = "window.__helios_sync_media();";` from both places in `defaultSyncMedia()`.

## Variations
No variations planned.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts`.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-determinism.ts`.
