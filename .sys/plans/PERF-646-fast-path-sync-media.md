---
id: PERF-646
slug: fast-path-sync-media
status: unclaimed
claimed_by: ""
created: 2024-06-01
completed: ""
result: ""
---

# PERF-646: Fast Path Sync Media Check in CdpTimeDriver

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts` (`defaultSyncMedia`)

## Background Research
Currently, in `CdpTimeDriver.ts` inside `runSetTime`, we do `if (this.hasMedia) { this.defaultSyncMedia(); }`.
Inside `defaultSyncMedia`, we check `if (frames.length === 1)`. The value `frames` corresponds to `this.cachedFrames`.
`this.cachedFrames` is an array of frames, but in typical video renders (like the DOM benchmark), there is only 1 frame.
Because `this.cachedFrames.length === 1` is invariant for the duration of most standard renders, we can optimize `runSetTime` to use a fast-path that directly issues the CDP command for the single frame case, avoiding the function call overhead of `defaultSyncMedia()` and the branching inside it.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames), mp4 libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.180s
- **Bottleneck analysis**: The `defaultSyncMedia` method is called every frame in the hot loop. Function calls and branching inside hot loops add overhead in V8.

## Implementation Spec

### Step 1: Inline Single-Frame Media Sync
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Replace the body of `runSetTime`'s media sync section:
```typescript
    // 1. Synchronize media elements
    if (this.hasMedia) {
      this.defaultSyncMedia();
    }
```
With:
```typescript
    // 1. Synchronize media elements
    if (this.hasMedia) {
      if (this.cachedFrames.length === 1) {
        this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams).catch(noopCatch);
      } else {
        this.defaultSyncMedia();
      }
    }
```

Remove `if (frames.length === 1) { ... } else { ... }` from `defaultSyncMedia` and just leave the `else` body, since `defaultSyncMedia` will only be called for multi-frame cases.

**Why**: By inlining the common case (`length === 1`) directly into `runSetTime`, we save a function call and simplify V8's hot path execution.

## Correctness Check
Run the tests and benchmark to verify determinism and performance.

## Prior Art
- Many optimizations (e.g. PERF-637, PERF-641) focused on stripping redundant calls and branches from the `CaptureLoop` and `CdpTimeDriver` hot loops.
