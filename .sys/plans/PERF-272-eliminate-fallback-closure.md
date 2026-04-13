---
id: PERF-272
slug: eliminate-fallback-closure
status: complete
claimed_by: "executor-session"
created: 2026-04-13
completed: "2026-04-13"
result: "discarded"
---

# PERF-272: Eliminate Fallback Closure Allocation in SeekTimeDriver

## Focus Area
The hot frame generation pipeline when in `dom` mode (using `SeekTimeDriver.ts`). This driver evaluates the seek script by dynamically binding inline arguments using `.evaluate(this.evaluateClosure, this.evaluateArgs)` where `evaluateClosure` is a class property but Playwright wraps it during cross-context serialization inside the `.evaluate` implementation.

## Background Research
In `CdpTimeDriver.ts`, similar overhead was reduced by passing a string implementation of the function to be evaluated, avoiding cross-context anonymous closure allocation via `page.evaluate("if (...) ...")` instead of a function handle (PERF-258).
Currently, `SeekTimeDriver.ts` uses:
```typescript
    this.evaluateArgs[0] = timeInSeconds;
    for (let i = 0; i < frames.length; i++) {
      promises[i] = frames[i].evaluate(
        this.evaluateClosure,
        this.evaluateArgs
      );
    }
```
Playwright serializes `this.evaluateClosure` along with arguments, causing overhead in the event loop for each frame iteration. By passing a pre-compiled string or modifying the CDP `callFunctionOn` fallback (when CDP is available, which it usually is in DOM mode since `prepare` provisions a `cdpSession`), we can avoid this. The CDP branch `if (frames.length === 1 && this.callParams.objectId)` already exists in `SeekTimeDriver.ts`:
```typescript
    if (frames.length === 1 && this.callParams.objectId) {
      this.callParams.arguments[0].value = timeInSeconds;
      this.callParams.arguments[1].value = this.timeout;
      return this.cdpSession!.send('Runtime.callFunctionOn', this.callParams) as Promise<any>;
    }
```
However, the `evaluate` path is still used when `frames.length > 1` or when `this.callParams.objectId` is unavailable.
To optimize this fallback, we can construct the evaluate script as a static string dynamically or keep the argument binding but evaluate an inline string, which skips closure serialization. E.g.:
```typescript
const script = `window.__helios_seek(${timeInSeconds}, ${this.timeout})`;
```

## Benchmark Configuration
- **Composition URL**: `file://.../output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: `1280x720`, `30fps`, `3 seconds`
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.262s
- **Bottleneck analysis**: Microtask and V8 dynamic closure serialization when evaluating fallbacks.

## Implementation Spec

### Step 1: Replace Playwright evaluate Closure with Static String in SeekTimeDriver
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In `setTime()`, locate the non-CDP evaluation fallback for `frames.length === 1` and `frames.length > 1`:
```typescript
    if (frames.length === 1) {
      this.evaluateArgs[0] = timeInSeconds;
      return frames[0].evaluate(
        this.evaluateClosure,
        this.evaluateArgs
      );
    }
```
Change it to pass a dynamically constructed string expression:
```typescript
    if (frames.length === 1) {
      return frames[0].evaluate(
        `window.__helios_seek(${timeInSeconds}, ${this.timeout})`
      );
    }
```
Similarly for the `frames.length > 1` loop:
```typescript
    const script = `window.__helios_seek(${timeInSeconds}, ${this.timeout})`;
    for (let i = 0; i < frames.length; i++) {
      promises[i] = frames[i].evaluate(script);
    }
```
**Why**: Avoids dynamic closure serialization over CDP inside `playwright.evaluate()`.
**Risk**: Negligible. The evaluated string executes exactly the same logic in the page context.

## Variations
### Variation A: Remove evaluateClosure and evaluateArgs class properties completely
If we use static strings, we no longer need the `evaluateClosure` and `evaluateArgs` class properties. These can be safely removed.

## Correctness Check
Run the DOM benchmark and inspect the resulting `test-output.mp4` to verify visual correctness.

## Results Summary
- **Best render time**: Regressed
- **Discarded experiments**: PERF-272
