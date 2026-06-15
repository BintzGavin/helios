---
id: PERF-773
slug: inline-media-sync-check
status: unclaimed
claimed_by: ""
created: 2024-06-15
completed: ""
result: ""
---

# PERF-773: Inline Media Sync Check in CdpTimeDriver

## Focus Area
`CdpTimeDriver.ts` hot loop `setTime` method.

## Background Research
Currently, `CdpTimeDriver.ts` uses a dynamic function assignment (`this.syncMediaFn`) initialized to either `this.defaultSyncMedia` or a no-op `() => {}` depending on `this.hasMedia`. In the hot path (`setTime`), it invokes `this.syncMediaFn()` on every frame.
Invoking an empty closure still incurs V8 call frame setup and teardown overhead. By checking the boolean `this.hasMedia` inline instead of relying on a dynamic function call, V8 can optimize the hot path to bypass the function call completely.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 150 frames, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.069s
- **Bottleneck analysis**: Call frame overhead for empty `syncMediaFn` invocation on the fast path where no media exists.

## Implementation Spec

### Step 1: Inline `hasMedia` check in `setTime`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove `this.syncMediaFn` entirely from `CdpTimeDriver`.
2. In `setTime`, change the execution from `this.syncMediaFn();` to:
```typescript
    if (this.hasMedia) {
        this.defaultSyncMedia();
    }
```
**Why**: V8 inline caches boolean checks faster than dynamically assigned function invocations. For compositions with no media, this entirely avoids the closure call overhead.
**Risk**: Minimal. `hasMedia` is properly initialized in `prepare()`.

## Variations
No variations.

## Canvas Smoke Test
Run `npm run test:canvas -w packages/renderer` or equivalent to ensure Canvas pipeline isn't impacted.

## Correctness Check
Run the DOM render benchmark script (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts`) to ensure it produces valid outputs without regressions.
