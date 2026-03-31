---
id: PERF-133
slug: precompile-cdp-sync-script
status: unclaimed
claimed_by: ""
created: 2024-05-27
completed: ""
result: ""
---
# PERF-133: Precompile dynamic CDP scripts in `CdpTimeDriver.ts`

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts`, specifically the `setTime` function, which currently re-creates and re-evaluates string-based scripts (`mediaSyncScript` and `stabilityScript`) on every frame in the hot capture loop.

## Background Research
Currently, `CdpTimeDriver` allocates string literals for `mediaSyncScript` and `stabilityScript` inside `setTime`, interpolating variables like `timeInSeconds`, and passes them to `page.evaluate()` or `frame.evaluate()`. This forces Chromium's V8 engine to re-parse, compile, and execute a brand-new anonymous function for every single frame across all workers.

By extracting these scripts into an `initScript` injected once during `prepare()` (or `init()`), we can expose them as global functions (e.g. `window.__helios_sync_media(timeInSeconds)` and `window.__helios_wait_until_stable()`). We can then invoke these cached functions using argument passing, bypassing the V8 script compilation overhead. This matches the successful optimization pattern already implemented in `SeekTimeDriver.ts`.

## Benchmark Configuration
- **Composition URL**: `output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds
- **Mode**: `dom` (Make sure to verify it works with `CdpTimeDriver` or `CanvasStrategy` if they share it, but benchmark focuses on `dom` execution throughput. Wait, `CdpTimeDriver` is primarily used for `canvas` mode currently, but `Renderer.ts` tests `dom` mode. So benchmarking `canvas` mode throughput is better for this driver.)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: Varies (around 34s for DOM, likely ~10-15s for Canvas)
- **Bottleneck analysis**: String allocation and V8 JIT compilation overhead on every frame evaluation.

## Implementation Spec

### Step 1: Inject initialization script in `prepare`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In `prepare(page: Page)` (or `init()`), inject a script using `page.addInitScript` (and also evaluate it immediately in existing frames, like `SeekTimeDriver` does) that defines the `mediaSyncScript` logic as `window.__helios_sync_media(t)` and the stability logic as `window.__helios_wait_until_stable()`.

```typescript
const initScript = `
  (() => {
    ${FIND_ALL_MEDIA_FUNCTION}
    ${PARSE_MEDIA_ATTRIBUTES_FUNCTION}
    ${SYNC_MEDIA_FUNCTION}

    window.__helios_sync_media = (t) => {
      const mediaElements = findAllMedia(document);
      mediaElements.forEach((el) => {
        syncMedia(el, t);
      });
    };

    window.__helios_wait_until_stable = async () => {
      if (typeof window.helios !== 'undefined' && typeof window.helios.waitUntilStable === 'function') {
        await window.helios.waitUntilStable();
      }
    };
  })();
`;
```
Also `await page.addInitScript(initScript);` and run it on all existing frames during `prepare()`.

### Step 2: Use lightweight argument evaluation in `setTime`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In `setTime(page: Page, timeInSeconds: number)`, replace the `mediaSyncScript` string creation with a direct call to the pre-compiled function:

```typescript
const syncPromise = frame.evaluate((t) => {
  if (typeof (window as any).__helios_sync_media === 'function') {
    (window as any).__helios_sync_media(t);
  }
}, timeInSeconds);
```

Similarly, replace `stabilityScript`:
```typescript
page.evaluate(() => {
  if (typeof (window as any).__helios_wait_until_stable === 'function') {
    return (window as any).__helios_wait_until_stable();
  }
});
```
**Why**: Avoids creating dynamic strings per frame and forces V8 to only compile the logic once, leveraging optimized argument passing for subsequent calls.
**Risk**: Very low. `SeekTimeDriver` already uses this exact pattern successfully.

## Correctness Check
Run the renderer benchmark script `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` or `fixtures/benchmark.ts` to ensure the strategy correctly synchronizes media elements and generates valid outputs.
