---
id: PERF-727
slug: preallocate-cdp-evaluate-payloads
status: unclaimed
claimed_by: ""
created: 2024-03-01
completed: ""
result: ""
---
# PERF-727: Preallocate CDP evaluate payloads in CdpTimeDriver Multi-Frame Sync Media

## Focus Area
The multi-frame sync media path inside the hot loop `runSetTime()` -> `defaultSyncMedia()` in `CdpTimeDriver.ts`.

## Background Research
The `defaultSyncMedia` function loops over `this.executionContextIds` to execute CDP `Runtime.evaluate` on multiple iframe contexts. However, the logic for generating the `this.multiFrameSyncMediaParams` array currently iterates over `this.executionContextIds.length` during the hot loop, checking length constraints and doing object assignments like `this.multiFrameSyncMediaParams[i] = { ... }`.
We can preallocate and cache these static parameters inside `handleExecutionContextCreated` when the execution contexts are actually formed to avoid conditional overhead and object creation inside the `else` branch of `defaultSyncMedia`.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/tests/benchmarks/dom-heavy`
- **Render Settings**: 1920x1080, 60 FPS, 10 seconds (600 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.317s (from PERF-725/PERF-726)
- **Bottleneck analysis**: Conditional checks and object allocation overhead during sync media.

## Implementation Spec

### Step 1: Preallocate `multiFrameSyncMediaParams` elements
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Instead of checking and creating new objects in `defaultSyncMedia`, we can update `multiFrameSyncMediaParams` whenever `executionContextCreated` happens or `prepare()` is called.

1. Modify `handleExecutionContextCreated` to also push a cached object to the params array:
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
2. Modify `prepare()` to also clear `multiFrameSyncMediaParams` alongside `this.executionContextIds`:
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

**Why**: Removes conditional length checks and array assignments from the hot `defaultSyncMedia()` loop completely.
**Risk**: Minimal. `handleExecutionContextCreated` is called correctly when execution contexts are formed.

## Correctness Check
Run tests in `packages/renderer` and ensure tests pass, specifically checking that DOM captures still render multi-frame videos properly.
