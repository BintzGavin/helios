---
id: PERF-725
slug: eliminate-redundant-checks-in-capture
status: unclaimed
claimed_by: ""
created: 2025-03-01
completed: ""
result: ""
---

# PERF-725: Preallocate CDP evaluate payloads in CdpTimeDriver Multi-Frame Sync Media

## Focus Area
The multi-frame sync media path inside the hot loop `runSetTime()` -> `defaultSyncMedia()` in `CdpTimeDriver.ts`.

## Background Research
The `defaultSyncMedia` function loops over `this.executionContextIds` to execute CDP `Runtime.evaluate` on multiple iframe contexts. However, the logic for generating the `this.multiFrameSyncMediaParams` array iterates over `this.executionContextIds.length`, checking length constraints and doing object assignments like `this.multiFrameSyncMediaParams[i] = { ... }`.
We can preallocate and cache these static parameters inside `handleExecutionContextCreated` when the execution contexts are actually formed to avoid conditional overhead and object creation inside the `else` branch of `defaultSyncMedia`.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.338s
- **Bottleneck analysis**: Conditional checks and object allocation overhead during sync media.

## Implementation Spec

### Step 1: Preallocate `multiFrameSyncMediaParams` elements
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Instead of checking and creating new objects in `defaultSyncMedia`, we can update `multiFrameSyncMediaParams` whenever `executionContextCreated` happens or `prepare()` is called.
The `handleExecutionContextCreated` method should push a cached object to `multiFrameSyncMediaParams` array.

1. Modify `handleExecutionContextCreated` to also populate the params array:
```typescript
  private handleExecutionContextCreated = (event: any) => {
    if (event.context.name === '') {
      this.executionContextIds.push(event.context.id);
      this.multiFrameSyncMediaParams.push({
          expression: "window.__helios_sync_media();",
          contextId: event.context.id,
          awaitPromise: false,
          returnByValue: false
      });
    }
  };
```
2. Modify `prepare()` to also clear `multiFrameSyncMediaParams`:
```typescript
    this.executionContextIds = [];
    this.multiFrameSyncMediaParams = [];
```
3. Update `defaultSyncMedia()` to simplify the multi-frame branch by removing the array generation logic:
```typescript
  private defaultSyncMedia() {
    const frames = this.cachedFrames;
    if (frames.length === 1) {
      this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams);
    } else {
        if (this.executionContextIds.length > 0) {
          for (let i = 0; i < this.executionContextIds.length; i++) {
            this.client!.send('Runtime.evaluate', this.multiFrameSyncMediaParams[i]);
          }
        } else {
          this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams);
        }
    }
  }
```

**Why**: Removes conditional checks and possible object allocations from the hot `defaultSyncMedia()` loop completely.
**Risk**: Minimal. `handleExecutionContextCreated` is called correctly when execution contexts are formed.

## Correctness Check
1. DOM frames are verified to be correctly captured and visually correct.
