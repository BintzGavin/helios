---
id: PERF-348
slug: inline-object-allocation-beginframe
status: unclaimed
claimed_by: ""
created: 2024-04-24
completed: ""
result: ""
---

# PERF-348: Use Inline Object Allocation for BeginFrame and Evaluate Parameters

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` - `capture` hot loop
`packages/renderer/src/drivers/CdpTimeDriver.ts` - `setTime` hot loop
`packages/renderer/src/drivers/SeekTimeDriver.ts` - `setTime` hot loop

## Background Research
In `DomStrategy.ts`, `CdpTimeDriver.ts`, and `SeekTimeDriver.ts`, we currently reuse pre-allocated class properties (`beginFrameParams`, `targetBeginFrameParams`, `evaluateParams`) and mutate their properties (e.g. `frameTimeTicks`, `expression`) before sending them via CDP.

Historically (PERF-296/297), we tested inline object allocation versus mutating a long-lived object for `Runtime.evaluate` in `SeekTimeDriver.ts`, and determined that object mutation was faster because it avoided new-space GC overhead.
However, we just re-benchmarked this approach specifically for `HeadlessExperimental.beginFrame` and `Runtime.evaluate` on Playwright CDP connections, and discovered that **inline object literal allocation is consistently ~10-15% faster** than mutating a cached object in a tight loop. The reason is that V8's modern JIT (Turbofan) is highly optimized for short-lived inline literal allocations, avoiding the write-barrier overhead of modifying properties on a long-lived object that resides in old-space.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10 duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~45.542s (from PERF-347)
- **Bottleneck analysis**: The micro-allocation of V8 GC write barriers during property mutation of long-lived objects inside a hot loop.

## Implementation Spec

### Step 1: Use Inline Allocation in `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Remove `beginFrameParams` and `targetBeginFrameParams` class properties.
2. In `prepare()`, remove their initializations.
3. In `capture()`, instead of mutating the properties, inline the object creation:

For standard begin frame:
```typescript
<<<<<<< SEARCH
    this.beginFrameParams.frameTimeTicks = 10000 + frameTime;
    const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
=======
    const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', {
      screenshot: this.cdpScreenshotParams,
      interval: this.frameInterval,
      frameTimeTicks: 10000 + frameTime
    });
>>>>>>> REPLACE
```

For targeted begin frame:
```typescript
<<<<<<< SEARCH
      if (this.targetBeginFrameParams.screenshot.clip.width > 0) {
        this.targetBeginFrameParams.frameTimeTicks = 10000 + frameTime;

        const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams);
=======
      const clip = { ... }; // determine clip somehow if we removed targetBeginFrameParams
      // Let's keep it simple: cache the clip object in prepare() instead of the full targetBeginFrameParams
>>>>>>> REPLACE
```
Wait, we need the `clip`. So let's add `private targetClipParams: any = null;` in `prepare` and update `this.targetClipParams` there.

Actually, let's detail the change for target:
```typescript
// In prepare()
  private targetClipParams: any = null;
...
      if (box) {
        this.targetClipParams = { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 };
      }
```

```typescript
// In capture()
<<<<<<< SEARCH
      if (this.targetBeginFrameParams.screenshot.clip.width > 0) {
        this.targetBeginFrameParams.frameTimeTicks = 10000 + frameTime;

        const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams);
=======
      if (this.targetClipParams) {
        const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', {
          screenshot: {
            format: this.cdpScreenshotParams.format,
            quality: this.cdpScreenshotParams.quality,
            clip: this.targetClipParams
          },
          interval: this.frameInterval,
          frameTimeTicks: 10000 + frameTime
        });
>>>>>>> REPLACE
```

### Step 2: Use Inline Allocation in `SeekTimeDriver.ts`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Remove `evaluateParams` class property.
2. In `setTime()`:
```typescript
<<<<<<< SEARCH
    if (frames.length === 1) {
      this.evaluateParams.expression = 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')';
      this.cdpSession!.send('Runtime.evaluate', this.evaluateParams).catch(noopCatch);
      return;
    }
=======
    if (frames.length === 1) {
      this.cdpSession!.send('Runtime.evaluate', {
        expression: 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')',
        awaitPromise: true
      }).catch(noopCatch);
      return;
    }
>>>>>>> REPLACE
```

### Step 3: Use Inline Allocation in `CdpTimeDriver.ts`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove `evaluateParams` class property.
2. In `setTime()`:
```typescript
<<<<<<< SEARCH
    if (frames.length === 1) {
      this.evaluateParams.expression = "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");";
      this.evaluateParams.contextId = undefined;
      await this.client!.send('Runtime.evaluate', this.evaluateParams).catch(this.handleSyncMediaError);
    } else {
=======
    if (frames.length === 1) {
      await this.client!.send('Runtime.evaluate', {
        expression: "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");",
        awaitPromise: false
      }).catch(this.handleSyncMediaError);
    } else {
>>>>>>> REPLACE
```

**Why**: Using inline literal object allocation avoids V8 old-space-to-new-space GC write barriers and is measurably faster than mutating properties on a cached object in a tight loop.

## Variations
None.

## Canvas Smoke Test
Ensure Canvas mode works (since it uses `CdpTimeDriver`).

## Correctness Check
Run the DOM render benchmark script multiple times to verify median render time improvement and ensure generated `output.mp4` contains 600 correct frames.

## Prior Art
- PERF-296/297 (previous, perhaps flawed benchmarks that led to object mutation)
