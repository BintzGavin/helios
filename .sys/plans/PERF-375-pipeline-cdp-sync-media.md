---
id: PERF-375
slug: pipeline-cdp-sync-media
status: unclaimed
claimed_by: ""
created: 2024-04-28
completed: ""
result: ""
---

# PERF-375: Pipeline CDP Sync Media in CdpTimeDriver

## Focus Area
Eliminate IPC roundtrip latency by pipelining `Runtime.evaluate` (for media sync) with `Emulation.setVirtualTimePolicy` in `CdpTimeDriver.ts`.

## Background Research
Currently, `CdpTimeDriver.ts` awaits the completion of the `Runtime.evaluate` call for media synchronization before advancing the virtual time:

```typescript
    if (frames.length === 1) {
      await this.client!.send('Runtime.evaluate', {
        expression: "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");",
        awaitPromise: false
      }).catch(this.handleSyncMediaError);
    }
```

Because `awaitPromise: false` is used, the script executes synchronously in the browser and returns immediately. However, awaiting the CDP `send` command in Node.js still incurs a full IPC roundtrip delay (Node.js -> Chrome -> Node.js) on every single frame.

Since CDP guarantees that messages on the same session are processed sequentially by the target, we do not need to `await` the `Runtime.evaluate` command in Node.js. We can fire it off and immediately send the `Emulation.setVirtualTimePolicy` command. The browser will process the media sync first, then process the virtual time advancement. Node.js only needs to `await` the `virtualTimeBudgetExpired` event, effectively eliminating an entire IPC roundtrip from the hot loop while maintaining exact execution order.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark (e.g., `examples/simple-animation/output/example-build/composition.html`)
- **Render Settings**: 1920x1080, 30 FPS, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3

## Baseline
- **Current estimated render time**: ~46.5s
- **Bottleneck analysis**: IPC roundtrip overhead in the `setTime` hot loop. Awaiting `Runtime.evaluate` without `awaitPromise` forces Node.js to pause until Chrome acknowledges the message, rather than pipelining the commands.

## Implementation Spec

### Step 1: Remove `await` from single-frame sync media
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In `runSetTime`, change:
```typescript
    if (frames.length === 1) {
      await this.client!.send('Runtime.evaluate', {
        expression: "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");",
        awaitPromise: false
      }).catch(this.handleSyncMediaError);
    }
```
to:
```typescript
    if (frames.length === 1) {
      this.client!.send('Runtime.evaluate', {
        expression: "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");",
        awaitPromise: false
      }).catch(this.handleSyncMediaError);
    }
```

### Step 2: Remove `await` from multi-frame sync media
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In `runSetTime`, for the multi-frame branches:
1. Remove `await Promise.all(framePromises);` completely.
2. The `framePromises` array and assignments can be left as is, or simplified to just call `.catch(this.handleSyncMediaError)` without storing the promises. Since we want to reduce allocations, you can remove `this.cachedPromises` usage entirely:

Change:
```typescript
        if (this.executionContextIds.length > 0) {
          if (this.cachedPromises.length !== this.executionContextIds.length) {
            this.cachedPromises = new Array(this.executionContextIds.length);
          }
          const framePromises = this.cachedPromises;
          const expression = "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");";
          for (let i = 0; i < this.executionContextIds.length; i++) {
            framePromises[i] = this.client!.send('Runtime.evaluate', {
              expression: expression,
              contextId: this.executionContextIds[i],
              awaitPromise: false
            }).catch(this.handleSyncMediaError);
          }
          await Promise.all(framePromises);
        } else {
          // ... fallback ...
```
To:
```typescript
        if (this.executionContextIds.length > 0) {
          const expression = "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");";
          for (let i = 0; i < this.executionContextIds.length; i++) {
            this.client!.send('Runtime.evaluate', {
              expression: expression,
              contextId: this.executionContextIds[i],
              awaitPromise: false
            }).catch(this.handleSyncMediaError);
          }
        } else {
          for (let i = 0; i < frames.length; i++) {
            frames[i].evaluate("if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");").catch(this.handleSyncMediaError);
          }
        }
```

**Why**: By not awaiting the `Runtime.evaluate` command, we allow the Node.js process to immediately send the `Emulation.setVirtualTimePolicy` command. Playwright pipes these commands into the CDP WebSocket sequentially. Chromium guarantees sequential processing of messages on the same session, ensuring the media sync executes before the virtual time advances, but we save the IPC acknowledgment latency.

**Risk**: If `frames[i].evaluate` in the fallback branch is used, it routes through Playwright's higher-level API, which might queue differently than raw CDP. However, this fallback is rarely hit (only on session reuse without context IDs). The raw CDP `send` will correctly pipeline.

## Correctness Check
- DOM captures should be identical.
- Media elements (video/audio in the DOM) must remain synchronized in the output.
