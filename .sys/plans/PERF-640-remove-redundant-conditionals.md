---
id: PERF-640
slug: remove-redundant-conditionals
status: unclaimed
claimed_by: ""
created: 2024-05-31
completed: ""
result: ""
---

# PERF-640: Remove Redundant Conditionals in Hot Loops (v2)

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` and `packages/renderer/src/drivers/CdpTimeDriver.ts`.

## Background Research
We target purely reductive micro-optimizations that eliminate redundant type checks and branching inside the hottest loop without altering the control flow logic.

1. **Unconditional Await in `CaptureLoop.ts`:**
The expression `strategy.capture()` inherently returns a `Promise`. Thus, checking `if (captureResult instanceof Promise)` is always `true` in DOM mode, and `CaptureLoop`'s union type still guarantees it resolves properly. Removing this check simplifies V8 compilation.

2. **Remove Unnecessary String Re-assignment in `CdpTimeDriver.ts`:**
`this.singleFrameSyncMediaParams.expression` is reassigned every frame despite being completely static.

These changes are individually safe, purely reductive, and target the exact same GC/branching bottleneck inside the tightest loop.

## Benchmark Configuration
- **Composition URL**: file:///app/examples/dom-benchmark/output/example-build/composition.html
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames), mp4 libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.317s
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

### Step 2: Remove unnecessary string assignment
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Update `private singleFrameSyncMediaParams: any = { expression: "", awaitPromise: false, returnByValue: false };` to `private singleFrameSyncMediaParams: any = { expression: "window.__helios_sync_media();", awaitPromise: false, returnByValue: false };`.
Remove `this.singleFrameSyncMediaParams.expression = "window.__helios_sync_media();";` from the `if (frames.length === 1)` branch in `defaultSyncMedia()` and also from the `else` block `if (this.executionContextIds.length === 0)` fallback.
**Why**: Avoid string mutation in V8 on every frame.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts`.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-determinism.ts`.
