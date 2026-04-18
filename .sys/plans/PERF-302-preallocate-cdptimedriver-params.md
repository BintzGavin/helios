---
id: PERF-302
slug: preallocate-cdptimedriver-params
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-302: Preallocate Runtime.evaluate params in CdpTimeDriver.ts

## Focus Area
Frame Capture Loop / Time Driver overhead

In `packages/renderer/src/drivers/CdpTimeDriver.ts`, inside the `setTime` method (the hot loop), when running in the single-frame optimized path, a new parameter object is allocated dynamically on every frame to call `Runtime.evaluate`:
`{ expression: "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");" }`

This mirrors an issue previously fixed in `SeekTimeDriver.ts` where we replaced dynamic object creation with a preallocated, long-lived `this.evaluateParams` object. Eliminating this object instantiation avoids unnecessary garbage collection pressure per frame in the CdpTimeDriver.

## Background Research
Although V8 is generally efficient at inline object allocation, inside a loop executing thousands of times per second (e.g., 60 FPS across multiple workers), allocating dynamic objects to pass to CDP methods (`send`) incurs compounding GC overhead. Reusing a single preallocated object and mutating its `expression` property is an established pattern in the renderer that improves memory stability.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1920x1080, 60 FPS, 10 seconds, `libx264` codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~48.2s (Varies by environment, refer to latest journal entries)
- **Bottleneck analysis**: Object allocation inside the frame hot loop adds V8 garbage collection overhead.

## Implementation Spec

### Step 1: Preallocate the parameter object
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Add a private class property:
`private syncMediaParams: any = { expression: '' };`

Update the single-frame execution block inside `setTime`:
```typescript
    if (frames.length === 1) {
      this.syncMediaParams.expression = "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");";
      await this.client!.send('Runtime.evaluate', this.syncMediaParams).catch(this.handleSyncMediaError);
    }
```
**Why**: Avoids creating a new object literal on every single frame, reducing memory allocation and GC pressure.
**Risk**: Negligible. The CDP `send` method serializes the parameters, so reusing the object object is thread-safe and safe against asynchronous mutation in Playwright.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` to ensure Canvas mode is unaffected.

## Correctness Check
Run the DOM smoke tests (`npx tsx tests/verify-dom-strategy-capture.ts`) and verify that media synchronization is not broken.

## Prior Art
- `SeekTimeDriver.ts` uses `this.evaluateParams` to avoid inline object allocation.
