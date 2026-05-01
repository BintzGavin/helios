---
id: PERF-406
slug: remove-promises-array-allocation-in-seek
status: unclaimed
claimed_by: ""
created: 2024-05-01
completed: ""
result: ""
---

# PERF-406: Preallocate `promises` array in SeekTimeDriver

## Focus Area
`packages/renderer/src/drivers/SeekTimeDriver.ts` - Browser `__helios_seek` injected script.

## Background Research
The `window.__helios_seek` script injected by `SeekTimeDriver` creates an array called `promises` dynamically if fonts, media elements, or stability checks are active (`let promises = null; ... if (!promises) promises = [];`). This causes an array literal to be allocated inside the browser's V8 engine and passed to `Promise.all` on every frame for every worker.

Microbenchmarks show that preallocating this array in the outer scope and dynamically setting `array.length = 0` on every tick avoids dynamic object allocation overhead and significantly reduces GC pressure for short-lived promises compared to conditionally allocating `new Array()` inside the hot loop.

## Benchmark Configuration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~34.041s
- **Bottleneck analysis**: The dynamically allocated `promises` array inside `window.__helios_seek` causes V8 garbage collection churn on every frame.

## Implementation Spec

### Step 1: Add cachedPromises to outer scope
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the `initScript` string, inside the IIFE scope, declare a `cachedPromises` array alongside the other caches:
```javascript
        // Cache for expensive DOM scans
        let cachedScopes = null;
        let cachedAnimations = null;
        let cachedMediaElements = null;
        const cachedPromises = []; // <--- Add this
```

### Step 2: Clear cachedPromises in invalidate
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Inside `window.__helios_invalidate_cache`, add `cachedPromises.length = 0;`:
```javascript
        window.__helios_invalidate_cache = () => {
          cachedScopes = null;
          cachedAnimations = null;
          cachedMediaElements = null;
          cachedPromises.length = 0; // <--- Add this
        };
```

### Step 3: Replace dynamic promises array in seek
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Inside `window.__helios_seek`, remove `let promises = null;` and instead clear `cachedPromises` at the start of the function:
```javascript
          cachedPromises.length = 0; // Clear at start of tick
```

Replace all references to `promises`:
- Change `if (!promises) promises = []; promises[promises.length] = document.fonts.ready;` to `cachedPromises[cachedPromises.length] = document.fonts.ready;`
- Change `if (!promises) promises = []; promises[promises.length] = createMediaPromise(el);` to `cachedPromises[cachedPromises.length] = createMediaPromise(el);`
- Change `if (!promises) promises = []; promises[promises.length] = window.helios.waitUntilStable();` to `cachedPromises[cachedPromises.length] = window.helios.waitUntilStable();`
- Change `if (promises && promises.length > 0) {` to `if (cachedPromises.length > 0) {`
- Change `const allReady = Promise.all(promises);` to `const allReady = Promise.all(cachedPromises);`

**Why**: By preallocating `cachedPromises`, V8 reuses the same memory block across iterations instead of dynamically instantiating new arrays, directly reducing garbage collector load during the CPU-bound Playwright CDP hot path.

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` to ensure core rendering functions are untouched.

## Correctness Check
Run `npx tsx tests/verify-seek-driver-stability.ts` to ensure the seek script still correctly stalls for promises and doesn't break due to array caching.
