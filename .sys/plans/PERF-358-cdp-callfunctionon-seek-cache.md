---
id: PERF-358
slug: cdp-callfunctionon-seek-cache
status: complete
claimed_by: "Jules"
created: 2026-10-18
completed: "2026-10-18"
result: ""
---

# PERF-358: Replace Runtime.evaluate with Runtime.callFunctionOn in SeekTimeDriver

## Focus Area
`packages/renderer/src/drivers/SeekTimeDriver.ts` - `setTime` hot loop.

## Background Research
Currently, inside the `setTime` method of `SeekTimeDriver.ts`, we construct a string `expression: 'window.__helios_seek(' + timeInSeconds + ')'` and execute it using Playwright's underlying CDP via `Runtime.evaluate` on *every single frame*.

According to V8 and CDP internals, `Runtime.evaluate` with a string argument forces the V8 compilation pipeline to re-parse and compile the string every time, even if the structure is almost identical, because the string literal itself changes (e.g. `window.__helios_seek(0.016)` vs `window.__helios_seek(0.033)`).

Instead, by using `Runtime.callFunctionOn`, we can pass a static function declaration string (which V8 caches natively) and pass the changing dynamic parameters via the `arguments` array.
Because we already inject `__helios_seek` onto the `window` object in `initScript`, we can use `callFunctionOn` directly on the `window` object (or the global context) and pass the `timeInSeconds` as an argument.

However, `Runtime.callFunctionOn` requires an `objectId` or an `executionContextId`. We already track `executionContextIds` inside `SeekTimeDriver.ts`. For the single-frame optimized path, we can simply pass an empty function declaration that calls the global and supply the execution context ID of the main frame, or just change the parameters to pass the arguments.

A simpler approach that avoids tracking the `window` object ID is to use `Runtime.callFunctionOn` with an `executionContextId` and a statically declared wrapper function string. V8 caches the compilation of the function declaration.

Wait, looking closer at `PERF-257`, it seems it attempted to use `Runtime.callFunctionOn` with an `objectId` for stability checks. Let's look at `Runtime.evaluate` vs `Runtime.callFunctionOn`.

If we change:
```typescript
    const expression = 'window.__helios_seek(' + timeInSeconds + ')';
    // ...
    this.cdpSession!.send('Runtime.evaluate', { expression, awaitPromise: true, ... });
```
to use a preallocated `callFunctionOn` params object where we just mutate the arguments array, we avoid string concatenation and compilation overhead.

```typescript
    // In constructor or init:
    this.seekFunctionParams = {
        functionDeclaration: 'function(t) { return window.__helios_seek(t); }',
        executionContextId: contextId,
        arguments: [{ value: 0 }],
        awaitPromise: true
    };

    // In setTime:
    this.seekFunctionParams.arguments[0].value = timeInSeconds;
    this.cdpSession!.send('Runtime.callFunctionOn', this.seekFunctionParams).catch(noopCatch);
```
Actually, wait, V8 optimizes inline string allocations incredibly well if they are small. However, bypassing the parser via `callFunctionOn` is theoretically faster. Let's verify this hypothesis.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10 duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~46.149s
- **Bottleneck analysis**: String concatenation `window.__helios_seek(...)` and subsequent V8 script compilation on every frame via `Runtime.evaluate` adds unnecessary CPU overhead in the renderer hot loop.

## Implementation Spec

### Step 1: Refactor `setTime` to use `Runtime.callFunctionOn`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In `SeekTimeDriver`, introduce `callFunctionOnParams` logic to replace `evaluate`.

1.  In `setTime`, instead of concatenating the expression string, preallocate the structure for `Runtime.callFunctionOn` (or mutate it if already preallocated).
    For the multi-frame case, we already maintain `multiFrameEvaluateParams`. Change it to `multiFrameCallParams`:
    ```typescript
    if (this.multiFrameCallParams.length !== this.executionContextIds.length) {
      this.multiFrameCallParams = new Array(this.executionContextIds.length);
      for (let i = 0; i < this.executionContextIds.length; i++) {
        this.multiFrameCallParams[i] = {
            functionDeclaration: 'function(t) { return window.__helios_seek(t); }',
            executionContextId: this.executionContextIds[i],
            arguments: [{ value: 0 }],
            awaitPromise: true,
            // Only add timeout if it was natively supported in callFunctionOn in this CDP version. Playwright's CDP might or might not.
            // Actually, evaluate has timeout, not sure if callFunctionOn does. If not, fallback to evaluate or just don't pass timeout (we rely on upstream).
        };
      }
    }
    ```
    *Wait, `callFunctionOn` does NOT natively support a `timeout` parameter in the Chrome DevTools Protocol.* It relies on the execution limits. But we can still use it. Wait, the `timeout` was added in `PERF-357`. If we lose the timeout, we might hang. But let's check CDP docs. If `callFunctionOn` doesn't have timeout, we can't safely use it.
    Actually, let's just stick to `Runtime.evaluate` but change the expression to call an anonymous function IIFE with arguments? No, `Runtime.evaluate` doesn't take arguments.
    Let's keep `Runtime.evaluate` but modify the approach, or investigate if `callFunctionOn` is significantly faster. Let's try `callFunctionOn` without the timeout since the browser pool usually aborts hung pages anyway.

    Let's use `callFunctionOn`.
    Replace the single frame evaluation:
    ```typescript
    if (frames.length === 1) {
        // We need an execution context ID for the main frame.
        // It's stored in this.executionContextIds[0] if available.
        // If not available, fallback to the old evaluate method.
        if (this.executionContextIds.length > 0) {
            this.cdpSession!.send('Runtime.callFunctionOn', {
                functionDeclaration: 'function(t) { return window.__helios_seek(t); }',
                executionContextId: this.executionContextIds[0],
                arguments: [{ value: timeInSeconds }],
                awaitPromise: true
            }).catch(noopCatch);
            return;
        } else {
            this.cdpSession!.send('Runtime.evaluate', {
                expression: 'window.__helios_seek(' + timeInSeconds + ')',
                awaitPromise: true
            }).catch(noopCatch);
            return;
        }
    }
    ```

    For multi-frame:
    ```typescript
    for (let i = 0; i < this.executionContextIds.length; i++) {
      const params = this.multiFrameEvaluateParams[i];
      // update to use callFunctionOn structure
      params.functionDeclaration = 'function(t) { return window.__helios_seek(t); }';
      params.arguments = [{ value: timeInSeconds }];
      params.contextId = undefined; // clear evaluate param
      params.executionContextId = this.executionContextIds[i];

      this.cdpSession!.send('Runtime.callFunctionOn', params).catch(noopCatch);
    }
    ```

**Why**: By sending a static string `functionDeclaration`, V8 can hit the compilation cache. The changing `timeInSeconds` is sent purely as JSON data in the `arguments` array, avoiding recompilation of a dynamic string expression.
**Risk**: `callFunctionOn` requires `executionContextId`. If the `executionContextIds` are out of sync or missing, it will fail.

## Variations
If the overhead of allocating the `arguments: [{ value: timeInSeconds }]` array object per frame negates the V8 compilation cache benefits (as seen in `PERF-348` and `PERF-350`), the experiment might fail. The Executor should measure carefully.

## Correctness Check
Run the DOM render benchmark script multiple times to verify median render time improvement and ensure generated `output.mp4` contains 600 correct frames.

## Prior Art
- `PERF-257` used `callFunctionOn` for stability checks but was discarded because it didn't improve over `page.evaluate` with a timeout node-side. However, this is for the hot loop `setTime` execution, which happens 60 times a second per worker.
- `PERF-350` and `PERF-351` showed that inline object allocations for evaluate parameters were slower than mutating cached objects. The executor should mutate the cached `multiFrameEvaluateParams` array to avoid GC churn.

## Results
- **Baseline**: 47.727s median
- **Experiment**: 47.843s median
- **Outcome**: Discarded. V8 dynamic string parsing/compilation overhead for such a short string is completely offset by the JSON serialization overhead for `arguments: [{value: x}]` via CDP. Code was reverted.
