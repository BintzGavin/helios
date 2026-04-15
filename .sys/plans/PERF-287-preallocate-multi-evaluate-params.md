---
id: PERF-287
slug: preallocate-multi-evaluate-params
status: complete
claimed_by: "Jules"
created: 2026-04-15
completed: "2026-04-15"
result: "Discarded - Optimization degraded performance"
---

# PERF-287: Preallocate CDP Parameters for Multi-Frame seek in SeekTimeDriver

## Focus Area
`packages/renderer/src/drivers/SeekTimeDriver.ts` - `setTime()` multi-frame execution path.

## Background Research
In PERF-286, we successfully replaced Playwright's `frame.evaluate` with direct CDP `Runtime.evaluate` calls for multi-frame execution. In the multi-frame code path inside `setTime()`, the driver dynamically allocates a fresh object for the evaluate parameters ` { expression: expression, contextId: this.executionContextIds[i], awaitPromise: true }` during every iteration over `this.executionContextIds` for every frame rendered.

A quick benchmarking script demonstrated that preallocating these parameter objects and merely updating their `expression` property is about 40% faster than continuously allocating new objects within the tight loop. Eliminating this object allocation reduces GC pressure and speeds up the capture hot loop.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: 1280x720, 30fps, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.040s
- **Bottleneck analysis**: Object allocation overhead during multi-frame execution parameter creation inside `setTime()`.

## Implementation Spec

### Step 1: Preallocate Multi-Frame Parameters
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Add a new private class property: `private multiEvaluateParams: any[] = [];`
2. Inside `prepare(page: Page)`, directly after setting `this.cachedPromises = new Array(this.executionContextIds.length);`, map the execution context IDs to parameter objects and store them:
```typescript
this.multiEvaluateParams = this.executionContextIds.map(id => ({
  expression: '',
  contextId: id,
  awaitPromise: true
}));
```
3. Inside `setTime(page: Page, timeInSeconds: number)`, modify the multi-frame branch's loop:
```typescript
    for (let i = 0; i < this.executionContextIds.length; i++) {
      const params = this.multiEvaluateParams[i];
      params.expression = expression;
      promises[i] = this.cdpSession!.send('Runtime.evaluate', params);
    }
```
**Why**: Avoids creating a new object literal per iframe per frame tick. Reusing a persistent array of statically typed objects speeds up parameter setup by reducing GC allocation and leveraging hidden classes.
**Risk**: In the unlikely event that `executionContextIds` changes dynamically post-initialization (though they are not updated currently after initialization), the param objects might drift. However, since the DOM is stable during rendering, this is safe.

## Variations
None.

## Canvas Smoke Test
Ensure Canvas mode `benchmark-test.js` continues to function.

## Correctness Check
Run `npx tsx scripts/benchmark-test.js` to ensure rendering output matches the standard DOM test perfectly.

## Prior Art
- PERF-286 introduced the `Runtime.evaluate` multi-frame logic, uncovering this micro-allocation opportunity.
- Various prior PERFs (e.g., PERF-087, PERF-147) successfully optimized CDP parameter allocations.

## Results Summary
```tsv
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	32.851	90	2.74	36.4	discard	preallocate multi-frame eval params
2	32.749	90	2.75	36.6	discard	preallocate multi-frame eval params
3	32.246	90	2.79	36.7	discard	preallocate multi-frame eval params
```
