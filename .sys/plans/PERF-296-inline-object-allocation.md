---
id: PERF-296
slug: inline-object-allocation
status: unclaimed
claimed_by: ""
created: 2024-05-18
completed: ""
result: ""
---

# PERF-296: Replace Old-Space Object Mutation with Inline Object Allocation in Hot Paths

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` and `packages/renderer/src/drivers/SeekTimeDriver.ts` - GC Write Barriers in the Hot Loop

## Background Research
In the hot loops of `DomStrategy.capture()` and `SeekTimeDriver.setTime()`, we are mutating properties on long-lived class properties (`this.beginFrameParams.frameTimeTicks = ...` and `this.evaluateParams.expression = ...`).
Because `frameTimeTicks` is often a float (which V8 boxes as a `HeapNumber`), and `expression` is a dynamically concatenated string, these newly allocated values are created in V8's "new space" (the nursery). When a pointer to a new-space object is stored in an "old-space" object (like `this.beginFrameParams` or `this.evaluateParams` which survived early GCs), V8 must trigger a "write barrier" to track the reference.
Write barriers execute on every mutation and can add measurable overhead in tight loops. V8 is highly optimized for short-lived inline object allocation. By removing the long-lived cached objects and instead allocating the parameter objects inline as literals, we can eliminate the write barrier overhead. (This also cleans up dead code in `SeekTimeDriver`).

## Benchmark Configuration
- **Composition URL**: `tests/fixtures/benchmark.ts` (DOM benchmark)
- **Render Settings**: 1920x1080, 60fps, 10s, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~47.232s (from PERF-295 results)
- **Bottleneck analysis**: GC write barriers during property mutation of long-lived objects.

## Implementation Spec

### Step 1: Remove Cached Object and Use Inline Allocation in `SeekTimeDriver.ts`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Remove `evaluateArgs`, `evaluateClosure`, and `evaluateParams` from the class properties.
2. In `constructor()`, remove `this.evaluateArgs[1] = timeout;`.
3. In `setTime()`, allocate the CDP payload dynamically.

Example:
```typescript
<<<<<<< SEARCH
    if (frames.length === 1) {
      this.evaluateParams.expression = 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')';
      return this.cdpSession!.send('Runtime.evaluate', this.evaluateParams) as Promise<any>;
    }
=======
    if (frames.length === 1) {
      return this.cdpSession!.send('Runtime.evaluate', {
        expression: 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')',
        awaitPromise: true
      }) as Promise<any>;
    }
>>>>>>> REPLACE
```
**Why**: Avoids old-to-new space write barriers and cleans up unused properties.

### Step 2: Use Inline Allocation in `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. In `capture()`, instead of mutating `this.beginFrameParams.frameTimeTicks = 10000 + frameTime;`, pass a new object literal directly into `cdpSession.send`.
2. Do the same for `this.targetBeginFrameParams` if used.

Example:
```typescript
<<<<<<< SEARCH
    this.beginFrameParams.frameTimeTicks = 10000 + frameTime;
    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
=======
    return this.cdpSession!.send('HeadlessExperimental.beginFrame', {
      ...this.beginFrameParams,
      frameTimeTicks: 10000 + frameTime
    });
>>>>>>> REPLACE
```
(Apply similarly to `targetBeginFrameParams`). Note: You can remove `frameTimeTicks` from the cached `this.beginFrameParams` in `prepare()`.

**Why**: Avoids old-to-new space write barriers for `HeapNumber` frame times.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx tests/fixtures/benchmark.ts` to verify basic rendering.

## Correctness Check
Run the DOM benchmark `npx tsx tests/fixtures/benchmark.ts` to ensure rendering finishes correctly.

## Prior Art
- PERF-191 (Inlined parameters in SeekTimeDriver, but was subsequently modified).
- V8 GC Write Barrier documentation.
