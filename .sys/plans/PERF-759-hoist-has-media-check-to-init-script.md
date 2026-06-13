---
id: PERF-759
slug: hoist-has-media-check-to-init-script
status: unclaimed
claimed_by: ""
created: 2024-06-13
completed: ""
result: ""
---

# PERF-759: Hoist Initial State Checks into `initScript` Playwright Context

## Focus Area
DOM Rendering Pipeline Initialization. Specifically, the media and stability pre-flight checks in `CdpTimeDriver.ts`. We want to reduce asynchronous blocking setup during the initial `prepare` phase.

## Background Research
During the `prepare` phase of `CdpTimeDriver.ts`, we currently use two `Runtime.evaluate` CDP calls to determine `hasMedia` and whether `waitUntilStable` is required.
In PERF-755, we tried replacing these with `page.evaluate()` closures to avoid CDP string evaluations, but Playwright's `page.evaluate()` overhead (serialization, internal routing) caused a massive regression.
However, we are *already* injecting an `initScript` into the page directly before these checks. We can simply append the checks into the `initScript` and let the page push the result back to Node.js, OR we can execute a single unified `Runtime.evaluate` call to retrieve all boolean state variables at once instead of two separate `Runtime.evaluate` queries.

If we combine the two checks into a single `Runtime.evaluate` with string concatenation, we save one entire IPC round trip.
Currently:
```typescript
    await this.client!.send('Runtime.evaluate', { expression: "typeof window.__helios_sync_media === 'function' ? window.__helios_sync_media() : 0", returnByValue: true }).then(...)

    await this.client!.send('Runtime.evaluate', { expression: "typeof window.helios !== 'undefined' && typeof window.helios.waitUntilStable === 'function'", returnByValue: true }).then(...)
```
We can unify this into a single `Runtime.evaluate` call that returns a JSON string or combined object. Actually, since it's `returnByValue: true`, we can return a JS object directly.

```typescript
    const result = await this.client!.send('Runtime.evaluate', {
      expression: "({ mediaCount: typeof window.__helios_sync_media === 'function' ? window.__helios_sync_media() : 0, hasStability: typeof window.helios !== 'undefined' && typeof window.helios.waitUntilStable === 'function' })",
      returnByValue: true
    }).catch(() => ({ result: { value: { mediaCount: 1, hasStability: false } } }));
```
This saves one full `Runtime.evaluate` IPC round-trip over CDP during the initialization phase, avoiding the overhead found in PERF-755 while still achieving the reduction in calls.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark composition
- **Render Settings**: 600x600, 30fps, 5s duration, ultrafast preset
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
Replace the two separate `this.client!.send('Runtime.evaluate', ...)` blocks with a single call.

```typescript
    this.hasMedia = false;
    let hasStability = false;

    await this.client!.send('Runtime.evaluate', {
       expression: "({ mediaCount: typeof window.__helios_sync_media === 'function' ? window.__helios_sync_media() : 0, hasStability: typeof window.helios !== 'undefined' && typeof window.helios.waitUntilStable === 'function' })",
       returnByValue: true
    }).then(({ result }) => {
      if (result && result.value) {
         this.hasMedia = result.value.mediaCount > 0;
         hasStability = result.value.hasStability;
      }
    }).catch(() => {
      this.hasMedia = true;
    });

    if (hasStability) {
        await this.client!.send('Runtime.evaluate', { expression: "if (typeof window.__helios_wait_until_stable === 'function') window.__helios_wait_until_stable();", awaitPromise: true, returnByValue: false }).catch(noopCatch);
    }
```

**Why**: Halves the number of CDP `Runtime.evaluate` calls required to determine initial page capabilities, avoiding the playwright overhead from PERF-755.
**Risk**: Very low. `returnByValue` handles plain objects perfectly.

## Variations
None.

## Canvas Smoke Test
Run `npm run build -w packages/renderer` to ensure no syntax errors.

## Correctness Check
Run the DOM render benchmark `cd packages/renderer && npx tsx scripts/benchmark-perf.ts` and verify output integrity and performance times.

## Prior Art
PERF-755 attempted to use `page.evaluate()` but failed due to Playwright serialization overhead. This approach uses raw CDP directly, maintaining fast-path performance while consolidating requests.
