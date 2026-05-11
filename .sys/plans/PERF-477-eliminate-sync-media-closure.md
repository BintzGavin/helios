---
id: PERF-477
slug: eliminate-sync-media-closure
status: unclaimed
claimed_by: ""
created: 2026-05-11
completed: ""
result: ""
---

# PERF-477: Eliminate syncMediaFn Closure Overhead

## Focus Area
`CdpTimeDriver.ts` in `@helios-project/renderer` package. Specifically, the media synchronization execution inside the `runSetTime` hot loop.

## Background Research
Currently, `CdpTimeDriver.ts` optimizes the media synchronization CDP call using a dynamically assigned closure property `this.syncMediaFn`.

In `prepare()`, it queries the DOM:
```typescript
const { result } = await this.client!.send('Runtime.evaluate', {
  expression: "document.querySelectorAll('video, audio').length > 0",
  returnByValue: true
});
if (result && result.value) {
  this.syncMediaFn = this.defaultSyncMedia.bind(this);
} else {
  this.syncMediaFn = () => {};
}
```

And in the `runSetTime` hot loop, it simply executes:
```typescript
// 1. Synchronize media elements
this.syncMediaFn(timeInSeconds);
```

While closure assignment is an elegant way to eliminate branching (`if/else`), V8 function calls, especially bound functions or dynamically assigned properties on hot objects, can sometimes introduce minor overhead compared to a primitive boolean check due to hidden class polymorphism or inline cache misses.

A previous experiment (PERF-468) successfully optimized the stability check by replacing an `instanceof Promise` check with a direct truthiness evaluation. We can apply a similar principle here: replace the `syncMediaFn` closure assignment with a boolean flag `this.hasMedia` and call the method directly.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 600x600, 30fps, mode: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.13s (from PERF-470)
- **Bottleneck analysis**: Minor execution overhead from dynamic closure invocation (`this.syncMediaFn`) inside the per-frame `runSetTime` execution path.

## Implementation Spec

### Step 1: Replace syncMediaFn with hasMedia boolean
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove the `private syncMediaFn` property.
2. Add a `private hasMedia: boolean = false;` property.
3. In `prepare()`, replace the assignment logic:
   ```typescript
   try {
     const { result } = await this.client!.send('Runtime.evaluate', {
       expression: "document.querySelectorAll('video, audio').length > 0",
       returnByValue: true
     });
     this.hasMedia = !!(result && result.value);
   } catch (e) {
     this.hasMedia = true;
   }
   ```
4. In `runSetTime`, replace the closure call with a direct conditional invocation:
   ```typescript
   // 1. Synchronize media elements
   if (this.hasMedia) {
     this.defaultSyncMedia(timeInSeconds);
   }
   ```

**Why**: Direct boolean evaluation (`this.hasMedia`) and static method invocation (`this.defaultSyncMedia`) is generally optimized extremely well by V8's Turbofan JIT compiler. It avoids the indirection of invoking a bound function (`.bind(this)`) or an anonymous empty function (`() => {}`), potentially saving a few micro-operations on every single frame tick.
**Risk**: Negligible. The functional behavior remains identical.

## Correctness Check
Run `npm test` in the `packages/renderer` directory to ensure test suites pass, verifying that the new implementation is logically equivalent and doesn't introduce bugs.
Run the benchmark script to compare performance.