---
id: PERF-728
slug: inline-set-time-and-pre-select-sync-media
status: unclaimed
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---
# PERF-728: Inline setTime and Pre-select Media Sync Strategy

## Focus Area
The hot frame loop execution path in `CdpTimeDriver.ts`, specifically the `setTime` method and media synchronization.

## Background Research
Currently, `setTime` acts as a wrapper that calls `runSetTime`, adding an unnecessary function call overhead on every single frame. Furthermore, inside `runSetTime`, the media synchronization function (`defaultSyncMedia`) evaluates `this.cachedFrames.length === 1` on every frame to decide between single-frame or multi-frame CDP `Runtime.evaluate` calls. Since `this.cachedFrames` is only ever populated once during `prepare()`, this branch condition is static throughout the entire render loop. By inlining `runSetTime` into `setTime` and conditionally assigning `syncMediaFn` to specialized closures during `prepare()`, we can eliminate a function wrapper and a static boolean branch from the hot loop. This builds upon the success of PERF-457, which effectively used closure assignment to avoid repeatedly evaluating `hasMedia`.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/tests/benchmarks/dom-heavy`
- **Render Settings**: 1920x1080, 60 FPS, 10 seconds (600 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.317s
- **Bottleneck analysis**: Unnecessary function indirection (`setTime` -> `runSetTime`) and static branch evaluation (`frames.length === 1`) inside the per-frame hot loop.

## Implementation Spec

### Step 1: Split `defaultSyncMedia` into specialized closures
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Remove `defaultSyncMedia` and replace it with two separate private arrow functions: `singleFrameSyncMedia` and `multiFrameSyncMedia`.
```typescript
  private singleFrameSyncMedia = () => {
    this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams);
  };

  private multiFrameSyncMedia = () => {
    if (this.executionContextIds.length > 0) {
      for (let i = 0; i < this.executionContextIds.length; i++) {
        this.client!.send('Runtime.evaluate', this.multiFrameSyncMediaParams[i]);
      }
    } else {
      this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams);
    }
  };
```
**Why**: Isolates the static branch into dedicated closures that execute without evaluating frame counts.
**Risk**: Minimal, as it accurately reflects the existing conditional logic.

### Step 2: Pre-select the sync strategy in `prepare()`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In `prepare()`, where `this.syncMediaFn` is assigned, conditionally assign the correct closure based on `this.cachedFrames.length`:
```typescript
    if (this.hasMedia) {
      if (this.cachedFrames.length === 1) {
        this.syncMediaFn = this.singleFrameSyncMedia;
      } else {
        this.syncMediaFn = this.multiFrameSyncMedia;
      }
      this.client!.on('Runtime.executionContextCreated', this.handleExecutionContextCreated);
      await this.client!.send('Runtime.enable').catch(noopCatch);
    } else {
      this.syncMediaFn = () => {};
    }
```
**Why**: Evaluates `cachedFrames.length` exactly once during setup, rather than N times during the frame loop.

### Step 3: Inline `runSetTime` into `setTime`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Remove the `runSetTime` wrapper function. Move its contents directly into `setTime(page: Page, timeInSeconds: number): Promise<void>`.
```typescript
  setTime(page: Page, timeInSeconds: number): Promise<void> {
    const delta = timeInSeconds - this.currentTime;

    if (delta <= 0) {
        return RESOLVED_PROMISE;
    }

    this.syncMediaFn();

    this.setVirtualTimePolicyParams.budget = delta * 1000;
    this.currentTime = timeInSeconds;
    const promise = new Promise<void>((resolve, reject) => {
      this.cdpResolve = resolve;
      this.cdpReject = reject;
    });
    this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams);
    return promise;
  }
```
**Why**: Avoids one function indirection layer on every frame.
**Risk**: Extremely low risk. The page argument is already unused in the body of `runSetTime`.

## Variations
None. This is a straightforward combination of two micro-optimizations on the same hot loop.

## Canvas Smoke Test
Run `npm run test` or check Canvas mode rendering to ensure no shared infrastructure is affected, though `CdpTimeDriver` is primarily used in DOM mode.

## Correctness Check
Run the package test suite (`npm run test -w packages/renderer`) or perform a manual render test to ensure multi-frame and single-frame DOM compositions still render correctly.

## Prior Art
Builds upon PERF-457 (which pre-selected `syncMediaFn` to avoid the `hasMedia` boolean check) and PERF-719 (which removed intermediate property access overhead).
