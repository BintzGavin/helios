---
id: PERF-285
slug: seek-time-evaluate
status: unclaimed
claimed_by: ""
created: 2026-04-15
completed: ""
result: ""
---

# PERF-285: Optimize SeekTimeDriver Evaluation Protocol

## Focus Area
`packages/renderer/src/drivers/SeekTimeDriver.ts` hot loop (`setTime`) dynamic closure evaluation over Playwright IPC.

## Background Research
Currently in `SeekTimeDriver.ts`'s `setTime` loop (the hot loop that advances time in `dom` mode), when there is only a single frame (the dominant case), it evaluates the time progression by invoking a pre-bound closure property (`evaluateClosure`) alongside an arguments array:
```typescript
    if (frames.length === 1) {
      this.evaluateArgs[0] = timeInSeconds;
      return frames[0].evaluate(
        this.evaluateClosure,
        this.evaluateArgs
      );
    }
```
This forces Playwright's `evaluate` to serialize both the closure and the arguments over the Node-to-browser IPC. Furthermore, `page.evaluate()` / `frame.evaluate()` has intrinsic overhead compared to raw CDP.

In contrast, if `objectId` is available (often true, but the `if (frames.length === 1 && this.callParams.objectId)` branch intercepts this currently), it falls back to raw CDP `Runtime.callFunctionOn` but relies on mutating `this.callParams.arguments[0].value`.

If we switch the single-frame execution entirely to raw CDP `Runtime.evaluate` using a pre-constructed string `window.__helios_seek(${timeInSeconds}, ${this.timeout})` instead of `Runtime.callFunctionOn` with an argument array or `frame.evaluate` with a closure, we bypass both Playwright's heavy `evaluate` serialization overhead and the CDP argument array serialization overhead. Although V8 has to parse the string, for a simple invocation this is extremely fast.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: 1280x720, 30fps, dom mode, duration 3s
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.2s
- **Bottleneck analysis**: IPC serialization and Playwright wrapper overhead during the per-frame `setTime` operation in DOM mode.

## Implementation Spec

### Step 1: Replace `callParams` with `evaluateParams`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Replace `this.callParams` with `this.evaluateParams`:
```typescript
  private evaluateParams: any = {
    expression: '',
    awaitPromise: true
  };
```
Remove the initialization of `this.callParams.functionDeclaration` and `objectId` capturing in `prepare()`.

**Why**: To prepare for raw CDP string evaluation.

### Step 2: Use `Runtime.evaluate` for single frame execution
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In `setTime`, rewrite the single-frame branch to strictly use `Runtime.evaluate`:
```typescript
    if (frames.length === 1) {
      this.evaluateParams.expression = 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')';
      return this.cdpSession!.send('Runtime.evaluate', this.evaluateParams) as Promise<any>;
    }
```

**Why**: Bypasses Playwright's `evaluate` wrapper and reduces CDP IPC payload complexity compared to `Runtime.callFunctionOn` with argument serialization.

## Variations
None.

## Canvas Smoke Test
Run standard examples to ensure canvas path isn't broken.

## Correctness Check
Run the DOM benchmark (`npx tsx scripts/benchmark-test.js`) and ensure frame count and rendering visually matches.

## Prior Art
PERF-274 demonstrated that string evaluation via `frame.evaluate()` is faster than closure passing in `CdpTimeDriver`. This experiment takes it further by skipping Playwright entirely and using CDP directly.
