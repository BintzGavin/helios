---
id: PERF-538
slug: cdptimedriver-callfunctionon
status: complete
claimed_by: "executor-session"
created: 2024-05-24
completed: 2026-05-18
result: no-improvement
---

# PERF-538: Replace Runtime.evaluate with Runtime.callFunctionOn in CdpTimeDriver

## Focus Area
Frame Capture Loop (`CdpTimeDriver.ts`).

## Background Research
Currently, `CdpTimeDriver.ts` uses string-based expressions (`"if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");"`) in `Runtime.evaluate` to synchronize media elements on every frame within `defaultSyncMedia`. Because the string changes dynamically (due to `timeInSeconds`), Chromium's V8 engine cannot cache the parsed AST, forcing it to re-parse the script on every frame tick. `CdpTimeDriver` operates its media sync entirely inside the tight frame loop without async pauses (`awaitPromise: false`), meaning the parse overhead is more concentrated here. By switching to `Runtime.callFunctionOn` with a static `functionDeclaration` and passing arguments, we allow V8 to cache the compiled function, potentially eliminating per-frame parse overhead.

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

### Step 1: Update CdpTimeDriver singleFrameSyncMediaParams
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Find the declaration of `singleFrameSyncMediaParams` (around line 19). Change it from:
```typescript
  private singleFrameSyncMediaParams: any = { expression: "", awaitPromise: false, returnByValue: false };
```
to:
```typescript
  private singleFrameSyncMediaParams: any = {
    functionDeclaration: "function(t) { if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(t); }",
    arguments: [{ value: 0 }],
    executionContextId: 0,
    awaitPromise: false,
    returnByValue: false
  };
```

### Step 2: Update defaultSyncMedia logic
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Modify the `defaultSyncMedia` method (around line 31).
Replace the current implementation with:
```typescript
  private defaultSyncMedia(timeInSeconds: number) {
    const frames = this.cachedFrames;
    if (frames.length === 1) {
      this.singleFrameSyncMediaParams.arguments[0].value = timeInSeconds;
      this.singleFrameSyncMediaParams.executionContextId = this.executionContextIds[0] || 1;
      this.client!.send('Runtime.callFunctionOn', this.singleFrameSyncMediaParams);
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
            this.client!.send('Runtime.callFunctionOn', this.multiFrameSyncMediaParams[i]);
          }
        } else {
          this.singleFrameSyncMediaParams.arguments[0].value = timeInSeconds;
          this.singleFrameSyncMediaParams.executionContextId = 1;
          this.client!.send('Runtime.callFunctionOn', this.singleFrameSyncMediaParams);
        }
    }
  }
```

**Why**: By sending a static `functionDeclaration` and passing arguments, Chromium avoids lexing and compiling a new JS string on every frame. Using `Runtime.callFunctionOn` is necessary for this approach.

## Record benchmark
Run the benchmark via `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to check if there is an improvement in render time. Run at least 3 times and note the median. Update `docs/status/RENDERER-EXPERIMENTS.md` with the outcome.

## Correctness Check
Run the renderer test suite using `npm run test -w packages/renderer -- --run` to verify that the changes do not break any tests.

## Results Summary
- **Best render time**: 17.462s (vs baseline 15.594s)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [PERF-538: Replace Runtime.evaluate with Runtime.callFunctionOn]
