---
id: PERF-612
slug: static-sync-media-expression
status: unclaimed
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---

# PERF-612: Static sync media CDP expression in CdpTimeDriver

## Focus Area
DOM Rendering Pipeline - CDP Hot Loop (`packages/renderer/src/drivers/CdpTimeDriver.ts`).

## Background Research
In the `CdpTimeDriver.ts` hot loop (`defaultSyncMedia` function), a JavaScript expression string is dynamically generated on every single frame using string concatenation:
```typescript
const expression = "window.__helios_sync_media(" + timeInSeconds + ");";
```
This forces V8 to repeatedly allocate, compile, and garbage-collect new strings thousands of times per render. A previous experiment (`PERF-598`) proposed caching these strings in a `Map`, but Map lookup overhead could still be measurable.
However, in `CdpTimeDriver.ts` `prepare()`, we already inject an override for `performance.now()` so that it perfectly matches the virtual time:
```typescript
    // Inject performance.now() override to match virtual time
    await page.evaluate((epoch) => {
      // @ts-ignore
      window.performance.now = () => Date.now() - epoch;
    }, INITIAL_VIRTUAL_TIME * 1000);
```
Because the execution context inside the headless browser already natively knows the exact `timeInSeconds` (via `performance.now() / 1000`), we do not need to interpolate `timeInSeconds` into the string from Node.js! We can simply evaluate a completely static string: `"window.__helios_sync_media();"`. The browser-side script can then call `performance.now() / 1000` itself.
By making the expression completely static, we entirely eliminate per-frame string concatenation and memory allocation.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: 600x600, 30fps, 5s duration, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.404s (from RENDERER-EXPERIMENTS.md current best)
- **Bottleneck analysis**: V8 string allocation overhead and garbage collection from per-frame string concatenation in the CDP hot loop.

## Implementation Spec

### Step 1: Modify `window.__helios_sync_media` in `initScript`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In the `prepare` method, update the `initScript` string.
Change:
```javascript
        window.__helios_sync_media = (t) => {
          if (!cachedMediaElements) {
            cachedMediaElements = findAllMedia(document);
          }
          const numMedia = cachedMediaElements.length;
          for (let i = 0; i < numMedia; i++) {
            syncMedia(cachedMediaElements[i], t);
          }
          return numMedia;
        };
```
To:
```javascript
        window.__helios_sync_media = () => {
          const t = performance.now() / 1000;
          if (!cachedMediaElements) {
            cachedMediaElements = findAllMedia(document);
          }
          const numMedia = cachedMediaElements.length;
          for (let i = 0; i < numMedia; i++) {
            syncMedia(cachedMediaElements[i], t);
          }
          return numMedia;
        };
```

### Step 2: Use static expression in `defaultSyncMedia`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In the `defaultSyncMedia` method, remove `timeInSeconds` concatenation.
Change:
```typescript
  private defaultSyncMedia(timeInSeconds: number) {
    const frames = this.cachedFrames;
    if (frames.length === 1) {
      this.singleFrameSyncMediaParams.expression = "window.__helios_sync_media(" + timeInSeconds + ");";
      this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams).catch(noopCatch);
    } else {
        if (this.executionContextIds.length > 0) {
          const expression = "window.__helios_sync_media(" + timeInSeconds + ");";
// ...
```
To:
```typescript
  private defaultSyncMedia() {
    const frames = this.cachedFrames;
    if (frames.length === 1) {
      this.singleFrameSyncMediaParams.expression = "window.__helios_sync_media();";
      this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams).catch(noopCatch);
    } else {
        if (this.executionContextIds.length > 0) {
          const expression = "window.__helios_sync_media();";
// ...
```
Update the caller in `runSetTime` (around line 222):
```typescript
    if (this.syncMediaState === 1 && this.hasMedia) {
      this.defaultSyncMedia(timeInSeconds);
    }
```
To:
```typescript
    if (this.syncMediaState === 1 && this.hasMedia) {
      this.defaultSyncMedia();
    }
```
And update the initial check in `prepare` (around line 172):
```typescript
         expression: "typeof window.__helios_sync_media === 'function' ? window.__helios_sync_media(0) : 0",
```
To:
```typescript
         expression: "typeof window.__helios_sync_media === 'function' ? window.__helios_sync_media() : 0",
```

**Why**: Using a static, constant string completely eliminates V8 string concatenation, runtime allocation, and garbage collection pressure in the hot loop.

## Correctness Check
Run the `npx tsx packages/renderer/scripts/benchmark-perf.ts` script to test performance, followed by `npx tsx packages/renderer/tests/verify-cdp-determinism.ts` to ensure virtual time matching still correctly drives `performance.now()`.
