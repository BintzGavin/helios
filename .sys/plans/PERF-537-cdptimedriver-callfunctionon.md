---
id: PERF-537
slug: cdptimedriver-callfunctionon
status: complete
claimed_by: "executor-session"
created: 2026-05-17
completed: 2026-05-18
result: "discarded"
---

# PERF-537: Replace Runtime.evaluate with Runtime.callFunctionOn in CdpTimeDriver

## Focus Area
Frame Capture Loop (`CdpTimeDriver.ts`).

## Background Research
Currently, `CdpTimeDriver.ts` uses string-based expressions (`"if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");"`) in `Runtime.evaluate` to synchronize media elements on every frame within `defaultSyncMedia`. Because the string changes dynamically (due to `timeInSeconds`), Chromium's V8 engine cannot cache the parsed AST, forcing it to re-parse the script on every frame tick. While `PERF-442` failed to show an improvement when applying this to `SeekTimeDriver.ts` (due to async tracking overhead), `CdpTimeDriver` operates its media sync entirely inside the tight frame loop without async pauses (`awaitPromise: false`), meaning the parse overhead is more concentrated here. By switching to `Runtime.callFunctionOn` with a static `functionDeclaration` and passing arguments, we allow V8 to cache the compiled function, potentially eliminating per-frame parse overhead.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: 1920x1080, 60fps, 10s duration (600 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~15.594s
- **Bottleneck analysis**: V8 parsing dynamically generated JS strings during the `CdpTimeDriver.defaultSyncMedia` hot loop.

## Implementation Spec

### Step 1: Update CdpTimeDriver DefaultSyncMedia
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Change the `singleFrameSyncMediaParams` properties and the `defaultSyncMedia` implementation to use `Runtime.callFunctionOn`. Note: The executor will need to correctly configure the parameters to map to `Runtime.callFunctionOn`'s expected types (e.g. `executionContextId` instead of `contextId` if needed, and passing arguments array).

Change `singleFrameSyncMediaParams` declaration:
```typescript
  private singleFrameSyncMediaParams: any = {
    functionDeclaration: "function(t) { if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(t); }",
    arguments: [{ value: 0 }],
    executionContextId: 0,
    awaitPromise: false,
    returnByValue: false
  };
```

Change `defaultSyncMedia` implementation:
```typescript
  private defaultSyncMedia(timeInSeconds: number) {
    const frames = this.cachedFrames;
    if (frames.length === 1) {
      this.singleFrameSyncMediaParams.arguments[0].value = timeInSeconds;
      this.singleFrameSyncMediaParams.executionContextId = this.executionContextIds[0] || 1; // Attempt a fallback if ID is missing
      this.client!.send('Runtime.callFunctionOn', this.singleFrameSyncMediaParams).catch(noopCatch);
    } else {
        if (this.executionContextIds.length > 0) {
          if (this.multiFrameSyncMediaParams.length !== this.executionContextIds.length) {
            this.multiFrameSyncMediaParams.length = this.executionContextIds.length;
            for (let i = 0; i < this.executionContextIds.length; i++) {
              this.multiFrameSyncMediaParams[i] = {
                functionDeclaration: "function(t) { if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(t); }",
                arguments: [{ value: 0 }],
                executionContextId: this.executionContextIds[i],
                awaitPromise: false,
                returnByValue: false
              };
            }
          }
          for (let i = 0; i < this.executionContextIds.length; i++) {
            this.multiFrameSyncMediaParams[i].arguments[0].value = timeInSeconds;
            this.client!.send('Runtime.callFunctionOn', this.multiFrameSyncMediaParams[i]).catch(noopCatch);
          }
        } else {
          this.singleFrameSyncMediaParams.arguments[0].value = timeInSeconds;
          this.singleFrameSyncMediaParams.executionContextId = 1; // Fallback to a default context if missing
          this.client!.send('Runtime.callFunctionOn', this.singleFrameSyncMediaParams).catch(noopCatch);
        }
    }
  }
```

*Note: The Executor must verify the correct parameter name (`executionContextId` vs `contextId`) for `callFunctionOn` based on CDP protocol docs, and ensure `executionContextIds` are populated correctly as they currently are used as `contextId` in `evaluate`.*

**Why**: By sending a static `functionDeclaration` and passing arguments, Chromium avoids lexing and compiling a new JS string on every frame.
**Risk**: `callFunctionOn` requires an `executionContextId` or `objectId`, whereas `evaluate` can omit it. We may need to ensure `executionContextIds` are reliably fetched or fallback properly.

## Correctness Check
Run the `npx tsx packages/renderer/tests/fixtures/benchmark.ts` script to test performance, followed by `npm run test -w packages/renderer -- --run` to verify correctness.

## Results Summary
- **Best render time**: 18.790s (vs baseline ~15.594s)
- **Improvement**: Regressed
- **Kept experiments**: []
- **Discarded experiments**: [PERF-537]
