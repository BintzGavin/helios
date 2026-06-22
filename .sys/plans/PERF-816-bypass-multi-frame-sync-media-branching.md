---
id: PERF-816
slug: bypass-multi-frame-sync-media-branching
status: complete
claimed_by: ""
created: 2024-06-21
completed: ""
result: ""
---

# PERF-816: Bypass Multi-Frame Sync Media Branching

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts` inside the `defaultSyncMedia()` hot path.

## Background Research
Currently, inside `CdpTimeDriver.ts`, the `defaultSyncMedia()` method evaluates the length of `this.executionContextIds` on every single frame to determine how many times to call `Runtime.evaluate` via the CDP session.

The `this.executionContextIds` array is populated exactly once during page load/initialization (`prepare` and CDP `Runtime.executionContextCreated` events) and does not change dynamically during the capture loop. By evaluating its length on every frame, we are introducing unnecessary branch evaluation and polymorphic behavior inside V8's hot path for what is effectively static state during capture.

We can pre-bind the correct synchronization path (single frame, single context, or multi-context) to a dynamic closure reference during the `prepare()` phase, entirely bypassing this branching and loop setup inside the hot frame loop.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The cost of evaluating conditional branching (`if (len === 0) ... else if (len === 1)`) and property accesses (`this.executionContextIds.length`) per frame adds minor CPU overhead. Eliminating these checks allows the `defaultSyncMedia` call to jump directly to the pre-resolved Chromium CDP `send` instruction.

## Implementation Spec

### Step 1: Pre-bind the Sync Media Path
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove the `defaultSyncMedia()` class method.
2. Add a new class property:
```typescript
  private syncMediaFn: () => void = () => {};
```
3. Inside `prepare(page: Page)`, after the execution contexts have stabilized (e.g., right before `this.currentTime = 0;`), assign the optimal closure to `this.syncMediaFn`:

```typescript
    // ... at the end of prepare()
    const len = this.executionContextIds.length;
    if (len === 0) {
      this.syncMediaFn = () => {
        this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams);
      };
    } else if (len === 1) {
      const param = this.multiFrameSyncMediaParams[0];
      this.syncMediaFn = () => {
        this.client!.send('Runtime.evaluate', param);
      };
    } else {
      const params = this.multiFrameSyncMediaParams;
      this.syncMediaFn = () => {
        for (let i = 0; i < len; i++) {
          this.client!.send('Runtime.evaluate', params[i]);
        }
      };
    }
```

### Step 2: Use the Pre-bound Function in the Hot Path
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Inside `setTime()`, replace the call to `this.defaultSyncMedia()` with `this.syncMediaFn()`:

```typescript
// 1. Synchronize media elements
    if (this.hasMedia) {
      this.syncMediaFn();
    }
```

**Why**: By determining the required CDP paths once during setup, the hot loop `setTime` execution becomes a single monomorphic function call pointing directly to the required instruction sequence, eliminating V8 branch checks entirely.

## Variations
N/A

## Canvas Smoke Test
Run `npm run build` to verify shared code compiles, and ensure tests in `packages/player` pass.

## Correctness Check
Run the `dom` mode benchmark script (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts --mode dom`). Ensure progress reporting is still emitted sequentially and the render completes successfully.

## Prior Art
- PERF-457: Skip Media Sync via Closure Assignment (Assigning `syncMediaFn` to avoid boolean branch in hot loop). This is the same principle applied to the multi-frame context arrays.
- PERF-776: Inline media sync check, which also removed branch evaluation overhead from the fast path.
