---
id: PERF-768
slug: eliminate-sync-media-cdp-call
status: complete
claimed_by: "executor-session"
created: 2024-06-14
completed: 2024-06-14
result: discard
---

# PERF-768: Eliminate per-frame CDP call by hoisting media sync to `requestAnimationFrame`

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts` and the `defaultSyncMedia` invocation.

## Background Research
In the current implementation of `CdpTimeDriver.ts`, media synchronization (updating video/audio `currentTime` to match virtual time) is driven from the Node.js side via a CDP `Runtime.evaluate` call on every frame:
```typescript
    // 1. Synchronize media elements
    this.syncMediaFn(); // Calls client!.send('Runtime.evaluate', ...)
```
This introduces a significant IPC overhead per frame. Even though the CDP call is fire-and-forget (we don't await the promise), it still serializes a CDP message, sends it over the WebSocket/pipe to the browser, and allocates internal tracking objects in Playwright.

Chromium's virtual time emulation runs the browser event loop based on the budget we provide. When we advance the virtual time budget by exactly one frame duration (e.g., `1000 / 30`), Chromium fires `requestAnimationFrame` (rAF). By injecting a persistent `requestAnimationFrame` loop in the browser during initialization, the browser can automatically execute `window.__helios_sync_media()` internally as virtual time advances.

By hoisting the synchronization to a native rAF loop, we entirely eliminate the `Runtime.evaluate` IPC call from the hot loop in Node.js, directly reducing the IPC footprint and Node event loop workload.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 150 frames, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.069s
- **Bottleneck analysis**: IPC messaging overhead between Node.js and Chromium for frame-by-frame script evaluation.

## Implementation Spec

### Step 1: Inject `requestAnimationFrame` loop in `CdpTimeDriver.ts` init script
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In the `initScript` string, inside the IIFE, add a rAF loop that continuously calls `window.__helios_sync_media()`:
```javascript
        const autoSync = () => {
           if (typeof window.__helios_sync_media === 'function') {
             window.__helios_sync_media();
           }
           requestAnimationFrame(autoSync);
        };
        requestAnimationFrame(autoSync);
```
Add this immediately after the `window.__helios_wait_until_stable` definition.

### Step 2: Remove `defaultSyncMedia` and Node.js CDP calls
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove the `defaultSyncMedia` method entirely.
2. Remove `singleFrameSyncMediaParams` and `multiFrameSyncMediaParams` properties.
3. Remove the logic inside `handleExecutionContextCreated` that pushes to `multiFrameSyncMediaParams`.
4. In `setTime()`, remove the invocation of `this.syncMediaFn();`.
5. Remove `this.syncMediaFn` property entirely.

**Why**: The browser will now self-synchronize media on every rendered frame via rAF, triggered naturally as virtual time advances. We no longer need to instruct it from Node.js.
**Risk**: If `requestAnimationFrame` doesn't fire deterministically with virtual time budget expirations, media might fall out of sync. However, Chromium's headless virtual time specifically integrates with rAF to ensure reliable animation timing, so it should fire exactly as expected.

## Correctness Check
Run the `npm run test -w packages/renderer` tests to ensure DOM rendering behavior remains correct and videos stay in sync.

## Results Summary
- **Best render time**: 2.188s (vs baseline 2.150s)
- **Improvement**: 0%
- **Kept experiments**:
- **Discarded experiments**: Eliminate per-frame CDP call by hoisting media sync to `requestAnimationFrame`
