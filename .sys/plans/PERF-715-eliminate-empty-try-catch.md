---
id: PERF-715
slug: eliminate-empty-try-catch
status: complete
claimed_by: "executor-session"
created: 2024-06-09
completed: "2026-06-09"
result: "discarded"
---

# PERF-715: Eliminate Empty Try-Catch Overhead in CdpTimeDriver `prepare`

## Focus Area
Pipeline Initialization (`CdpTimeDriver.prepare()`). The initialization path currently contains redundant try/catch blocks wrapped around highly predictable CDP evaluations (like checking if media exists) where errors are swallowed natively or default values are assigned.

## Background Research
V8 handles `try-catch` blocks efficiently in most standard contexts, but in cases where the exception handler assigns redundant state or is literally empty (`// Ignore error`), and the evaluation is highly deterministic or can use a native fallback condition, removing the block scope and utilizing a flat CDP `.catch()` simplifies the JIT compilation tree. In `CdpTimeDriver.ts`, there's a specific block tracking `waitUntilStable` that has an empty catch block that can be streamlined. Additionally, `Runtime.enable` uses `.catch(() => {})`, which creates an anonymous closure.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.62s
- **Bottleneck analysis**: The micro-optimizations aim to trim down memory allocation/closures within `prepare`.

## Implementation Spec

### Step 1: Simplify `hasMedia` and `waitUntilStable` Try-Catch Blocks in `prepare()`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Simplify the `hasMedia` and `waitUntilStable` try-catch blocks utilizing a `noopCatch`. Also, replace the empty closure in `.catch(() => {})` for `Runtime.enable` with `noopCatch`.

```typescript
<<<<<<< SEARCH
    try {
      this.hasMedia = false;
      const { result } = await this.client!.send('Runtime.evaluate', {
         expression: "typeof window.__helios_sync_media === 'function' ? window.__helios_sync_media() : 0",
         returnByValue: true
      });
      if (result && result.value > 0) {
         this.hasMedia = true;
      }
    } catch (e) {
      this.hasMedia = true;
    }

    try {
      const { result } = await this.client!.send('Runtime.evaluate', {
        expression: "typeof window.helios !== 'undefined' && typeof window.helios.waitUntilStable === 'function'",
        returnByValue: true
      });
      if (result && result.value) {
        await this.client!.send('Runtime.evaluate', { expression: "if (typeof window.__helios_wait_until_stable === 'function') window.__helios_wait_until_stable();", awaitPromise: true, returnByValue: false });
      }
    } catch (e) {
      // Ignore error
    }

    if (this.hasMedia) {
      this.syncMediaFn = this.defaultSyncMedia;
      this.client!.on('Runtime.executionContextCreated', this.handleExecutionContextCreated);
      // Enable Runtime so we actually receive executionContextCreated events
      // Catch errors in case another driver instance sharing this session already enabled it.
      await this.client!.send('Runtime.enable').catch(() => {});
    } else {
=======
    const noopCatch = () => {};

    this.hasMedia = false;
    await this.client!.send('Runtime.evaluate', {
       expression: "typeof window.__helios_sync_media === 'function' ? window.__helios_sync_media() : 0",
       returnByValue: true
    }).then(({ result }) => {
      if (result && result.value > 0) {
         this.hasMedia = true;
      }
    }).catch(() => {
      this.hasMedia = true;
    });

    await this.client!.send('Runtime.evaluate', {
      expression: "typeof window.helios !== 'undefined' && typeof window.helios.waitUntilStable === 'function'",
      returnByValue: true
    }).then(async ({ result }) => {
      if (result && result.value) {
        await this.client!.send('Runtime.evaluate', { expression: "if (typeof window.__helios_wait_until_stable === 'function') window.__helios_wait_until_stable();", awaitPromise: true, returnByValue: false }).catch(noopCatch);
      }
    }).catch(noopCatch);

    if (this.hasMedia) {
      this.syncMediaFn = this.defaultSyncMedia;
      this.client!.on('Runtime.executionContextCreated', this.handleExecutionContextCreated);
      // Enable Runtime so we actually receive executionContextCreated events
      // Catch errors in case another driver instance sharing this session already enabled it.
      await this.client!.send('Runtime.enable').catch(noopCatch);
    } else {
>>>>>>> REPLACE
```

**Why**: Replaces dynamic `try...catch` scope allocations with pre-bound flat promise rejection handlers to streamline the initialization sequence and avoid closure allocations.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx scripts/benchmark-perf.ts` and ensure it completes without throwing unhandled exceptions during setup.

## Correctness Check
The output video should match the expected rendering timing since these changes do not alter media playback behavior, only exception handling paths during CDP initialization.

## Results Summary
- **Best render time**: 2.779s (vs baseline 2.695s)
- **Improvement**: -3.12%
- **Kept experiments**: None
- **Discarded experiments**: PERF-715
