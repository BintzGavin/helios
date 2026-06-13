---
id: PERF-755
slug: runtime-evaluate-has-media
status: unclaimed
claimed_by: ""
created: 2024-06-13
completed: ""
result: ""
---

# PERF-755: Pre-Evaluate Runtime.evaluate for hasMedia in CdpTimeDriver

## Focus Area
DOM Rendering Pipeline Initialization. Specifically, the media and stability pre-flight checks in `CdpTimeDriver.ts`. We want to reduce asynchronous blocking setup during the initial `prepare` phase to improve the end-to-end rendering startup latency.

## Background Research
During the `prepare` phase of `CdpTimeDriver.ts`, there are two blocking calls to `Runtime.evaluate` to determine if media exists (`hasMedia`) and if `waitUntilStable` is defined. This adds round-trip latency to the initialization sequence.

Since `hasMedia` fundamentally dictates whether `Runtime.executionContextCreated` listeners are attached and if `Runtime.enable` was needed *earlier* (which was already moved to `DomStrategy.ts`), we can optimize how these expressions are invoked.

Currently:
1. Init script is added via `page.addInitScript`.
2. It's evaluated on all frames immediately.
3. We await `Runtime.evaluate` to check for media.
4. We await `Runtime.evaluate` to check for stability functions.

We can streamline this. We can evaluate `hasMedia` directly in the playwright page evaluation context using standard `page.evaluate` *before* dropping down to raw CDP, or bundle the result checking into the same frame evaluation pass, reducing IPC round-trips over CDP during setup.

*Wait*, we actually can just combine the evaluation checks or use `page.evaluate` rather than raw CDP for setup phase checks.
Actually, we can just run the initialization scripts and extract the boolean states immediately using Playwright's `evaluate`, rather than making separate CDP calls. Or, simply pre-evaluate them in a single CDP call.

Let's optimize `CdpTimeDriver.prepare()`. The goal is to reduce the number of blocking calls. We can fetch both `hasMedia` and `hasStabilityCheck` in a single `page.evaluate()` call.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark composition
- **Render Settings**: Same as baseline
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.36s - 2.4s
- **Bottleneck analysis**: IPC overhead and multiple awaits during the initial preparation phase before capture begins.

## Implementation Spec

### Step 1: Combine feature detection in CdpTimeDriver.prepare
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Replace the two separate `this.client!.send('Runtime.evaluate', ...)` blocks that check for `hasMedia` and execute stability checks.
Instead, use a single `page.evaluate` call to retrieve a boolean flag indicating if media exists, and execute stability if present, or just retrieve both flags.

```typescript
    const result = await page.evaluate(() => {
      const mediaCount = typeof (window as any).__helios_sync_media === 'function' ? (window as any).__helios_sync_media() : 0;
      const hasStability = typeof (window as any).helios !== 'undefined' && typeof (window as any).helios.waitUntilStable === 'function';
      return { mediaCount, hasStability };
    }).catch(() => ({ mediaCount: 1, hasStability: false })); // Default conservative

    this.hasMedia = result.mediaCount > 0;

    if (result.hasStability) {
      await page.evaluate(() => {
        if (typeof (window as any).__helios_wait_until_stable === 'function') {
           return (window as any).__helios_wait_until_stable();
        }
      }).catch(() => {});
    }
```
**Why**: Reduces the number of CDP round trips during the critical setup phase. `page.evaluate` is cleaner and easier to reason about for one-off setup checks than raw CDP `Runtime.evaluate` with string expressions.
**Risk**: Playwright `page.evaluate` might behave slightly differently than CDP `Runtime.evaluate` if the context is isolated, but since we just injected the script into the main world, it should be fine.

## Canvas Smoke Test
Run `npx tsx examples/canvas.ts` to ensure Canvas mode still works.

## Correctness Check
Run the standard DOM benchmark and ensure the video renders with correct timing.

## Prior Art
Optimizations like PERF-713 and PERF-751 showed that moving CDP commands or simplifying try/catch blocks had mixed results. This simplifies the async chain during initialization.
