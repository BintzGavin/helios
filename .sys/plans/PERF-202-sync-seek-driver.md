---
id: PERF-202
slug: sync-seek-driver
status: complete
claimed_by: "executor-session"
created: 2024-05-25
completed: "2024-05-25"
result: "improved"
---

# PERF-202: Eliminate Script Parsing Overhead via Runtime.callFunctionOn

## Focus Area
DOM Rendering Pipeline - Frame Capture Loop Hot Path (Phase 4)

## Background Research
Currently, `SeekTimeDriver.setTime` evaluates a dynamically interpolated script string on every frame using `Runtime.evaluate`:
`window.__helios_seek(${timeInSeconds}, ${this.timeout})`
Because the string literal changes constantly as time advances, V8 cannot cache the parsed Abstract Syntax Tree (AST) or byte code. This forces the browser to allocate a new string, parse it, compile it, and execute it 60 times per second for every parallel worker, resulting in unnecessary CPU overhead and V8 garbage collection micro-stalls.
By refactoring this to use `Runtime.callFunctionOn` with a static `functionDeclaration` and dynamic `arguments`, V8 will cache the compiled function after the first invocation.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Baseline identical settings across all runs
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.7s
- **Bottleneck analysis**: IPC string serialization and continuous V8 AST parsing/compilation overhead in the hot loop.

## Implementation Spec

### Step 1: Pre-allocate static parameters for callFunctionOn
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Replace the existing `evaluateParams` class property with `callParams`:
```typescript
  private callParams: any = {
    functionDeclaration: 'function(t, timeout) { return this.__helios_seek(t, timeout); }',
    objectId: '',
    arguments: [ { value: 0 }, { value: 0 } ],
    awaitPromise: true,
    returnByValue: false
  };
```
Keep `evaluateParams` as a fallback since `callFunctionOn` requires an `objectId`.

### Step 2: Fetch window objectId during prepare
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the `prepare()` method, after `this.cdpSession` is initialized and scripts are injected:
```typescript
    const windowRes = await this.cdpSession!.send('Runtime.evaluate', { expression: 'window' });
    if (windowRes.result && windowRes.result.objectId) {
        this.callParams.objectId = windowRes.result.objectId;
    }
    this.callParams.arguments[1].value = this.timeout;
```

### Step 3: Use callFunctionOn in hot loop
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In `setTime()`, check if `this.callParams.objectId` is populated. If it is and `frames.length === 1`, use `Runtime.callFunctionOn`:
```typescript
    if (frames.length === 1 && this.callParams.objectId) {
      this.callParams.arguments[0].value = timeInSeconds;
      return this.cdpSession!.send('Runtime.callFunctionOn', this.callParams) as Promise<any>;
    }
```
Otherwise, fallback to the existing `evaluateParams.expression` loop.

## Variations
- **Variation A**: Attempt to pass the function via `Runtime.evaluate` by evaluating a closure generator once, storing the `objectId` of the returned function, and then calling `Runtime.callFunctionOn` on that function directly without `window` binding.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still works properly.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-driver.ts` (or similar seek test) to verify DOM fallback capture succeeds.

## Results Summary
- **Best render time**: 32.947s
- **Improvement**: ~2.3%
- **Kept experiments**: PERF-202
- **Discarded experiments**: None
