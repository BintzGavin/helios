---
id: PERF-290
slug: inline-cdptime-driver-evaluate
status: unclaimed
claimed_by: ""
created: 2024-05-10
completed: ""
result: ""
---

# PERF-290: Optimize CdpTimeDriver single-frame evaluation by replacing Playwright IPC closure with raw CDP string evaluation over Runtime.evaluate

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts` - `setTime` method.

## Background Research
Currently, when `CdpTimeDriver.setTime` attempts to synchronize media elements, it uses `Runtime.callFunctionOn` with pre-allocated param configurations to execute stability checks, and similarly for single frame `syncMedia`.
Based on prior successes, notably `PERF-285` where we optimized `SeekTimeDriver` single-frame evaluation by replacing Playwright IPC closures with raw CDP string evaluation using `Runtime.evaluate`, and `PERF-286` handling `SeekTimeDriver` multi-frame. The same principle applies here - we can replace `Runtime.callFunctionOn` with raw string `Runtime.evaluate` to skip object reference overhead, which requires managing `objectId`s, and simply evaluate the string in the global scope.

In fact, `Runtime.evaluate` passes string-only payloads which can avoid lookup of `objectId` inside the execution context.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition (from `scripts/benchmark-test.js`)
- **Render Settings**: 1280x720, 30 FPS, 3s duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 1 per experiment to test validity; append final result to the journal.

## Baseline
- **Current estimated render time**: ~32.040s
- **Bottleneck analysis**: Resolving `objectId` and calling `Runtime.callFunctionOn` requires slightly more complex V8 serialization than straightforward `Runtime.evaluate` strings for single frame stability checks.

## Implementation Spec

### Step 1: Replace `Runtime.callFunctionOn` with `Runtime.evaluate` for stability check
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
- Find `setTime` method.
- Replace the check:
```typescript
<<<<<<< SEARCH
      await Promise.race([
        (this.waitStableParams.objectId
          ? this.client!.send('Runtime.callFunctionOn', this.waitStableParams).then(this.handleStabilityCheckResponse)
          : page.evaluate("if (typeof window.__helios_wait_until_stable === 'function') window.__helios_wait_until_stable();")),
        timeoutPromise
      ]);
=======
      await Promise.race([
        this.client!.send('Runtime.evaluate', {
          expression: "if (typeof window.__helios_wait_until_stable === 'function') window.__helios_wait_until_stable();",
          awaitPromise: true
        }).then(this.handleStabilityCheckResponse),
        timeoutPromise
      ]);
>>>>>>> REPLACE
```

### Step 2: Replace `Runtime.callFunctionOn` for single frame sync media
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
```typescript
<<<<<<< SEARCH
    const frames = this.cachedFrames;
    if (frames.length === 1 && this.syncMediaParams.objectId) {
      this.syncMediaParams.arguments[0].value = timeInSeconds;
      await this.client!.send('Runtime.callFunctionOn', this.syncMediaParams).catch(this.handleSyncMediaError);
    } else {
      if (frames.length === 1) {
        await this.client!.send('Runtime.evaluate', {
          expression: "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");"
        }).catch(this.handleSyncMediaError);
      } else {
=======
    const frames = this.cachedFrames;
    if (frames.length === 1) {
      await this.client!.send('Runtime.evaluate', {
        expression: "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");"
      }).catch(this.handleSyncMediaError);
    } else {
>>>>>>> REPLACE
```

### Step 3: Remove unused params allocation
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
- Delete `this.waitStableParams` and `this.syncMediaParams` and `windowRes` logic in `prepare()`.

**Why**: Using string evaluations skips object id lookup inside V8.

**Risk**: Risk is low as long as `window` object is still valid context, which `Runtime.evaluate` defaults to global anyway.

### Step 4: Verification
Use `run_in_bash_session` to execute `cd packages/renderer && npx tsx scripts/benchmark-test.js` to observe and log performance gains. Add results to `.sys/perf-results.tsv`. Update `docs/status/RENDERER-EXPERIMENTS.md` with findings and PR the results.

## Correctness Check
Rendered output video should be identical in quality and complete 90 frames successfully.

## Canvas Smoke Test
Smoke test using Canvas logic in `benchmark-test.js`.

## Variations
If no improvement, discard the changes.
