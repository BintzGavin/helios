---
id: PERF-741
slug: preallocate-call-function-on-cdp-time-driver
status: unclaimed
claimed_by: ""
created: 2024-06-12
completed: ""
result: ""
---

# PERF-741: Replace `Runtime.evaluate` with `Runtime.callFunctionOn` in `CdpTimeDriver`

## Focus Area
The `defaultSyncMedia` hot loop in `CdpTimeDriver.ts`. We want to eliminate the overhead of V8 string parsing by replacing `Runtime.evaluate` with `Runtime.callFunctionOn`.

## Background Research
In PERF-738, we successfully replaced `Runtime.evaluate` with preallocated payloads and `Runtime.callFunctionOn` in `SeekTimeDriver`, which reduced string garbage collection pressure and eliminated the need to parse JavaScript on every frame.
Currently, `CdpTimeDriver`'s `defaultSyncMedia` still uses `Runtime.evaluate` with string expressions for both single and multi-frame synchronization:
```typescript
  private singleFrameSyncMediaParams: any = { expression: "window.__helios_sync_media();", awaitPromise: false, returnByValue: false };
```
We can apply the same optimization to `CdpTimeDriver` by switching to `Runtime.callFunctionOn` using `functionDeclaration` and passing `executionContextIds`. This will completely avoid the need to parse the `"window.__helios_sync_media();"` string on every frame in the browser context.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/tests/benchmarks/dom-heavy`
- **Render Settings**: 1920x1080, 60 FPS, 10 seconds (600 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.364s (from PERF-719)
- **Bottleneck analysis**: String parsing overhead in the browser during the per-frame `Runtime.evaluate` hot loop.

## Implementation Spec

### Step 1: Optimize Sync Media Payloads
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Rename `singleFrameSyncMediaParams` to `singleFrameCallParams` and initialize it with `Runtime.callFunctionOn` parameters:
   ```typescript
   private singleFrameCallParams: any = { functionDeclaration: "function() { window.__helios_sync_media(); }", awaitPromise: false, returnByValue: false, executionContextId: undefined };
   ```
2. Rename `multiFrameSyncMediaParams` to `multiFrameCallParams`.
3. Update `handleExecutionContextCreated` to preallocate `Runtime.callFunctionOn` payloads with `executionContextId`:
   ```typescript
      this.multiFrameCallParams.push({
          functionDeclaration: "function() { window.__helios_sync_media(); }",
          executionContextId: event.context.id,
          awaitPromise: false,
          returnByValue: false
      });
   ```
4. Modify `defaultSyncMedia` to use `Runtime.callFunctionOn` and dynamically set `executionContextId` for the single-frame case (if we fall back to a cached default execution context ID, or handle single-frame by setting `executionContextId: this.executionContextIds[0]`).
   ```typescript
  private defaultSyncMedia() {
    if (this.executionContextIds.length > 0) {
      if (this.executionContextIds.length === 1) {
          this.singleFrameCallParams.executionContextId = this.executionContextIds[0];
          this.client!.send('Runtime.callFunctionOn', this.singleFrameCallParams);
      } else {
        for (let i = 0; i < this.executionContextIds.length; i++) {
          this.client!.send('Runtime.callFunctionOn', this.multiFrameCallParams[i]);
        }
      }
    }
  }
   ```
**Why**: Preallocating `Runtime.callFunctionOn` parameters bypasses per-frame string parsing in V8, mirroring the successful optimization applied to `SeekTimeDriver`.
**Risk**: Very low.

## Correctness Check
Run the `dom` benchmark and verify output video generation completes successfully.
