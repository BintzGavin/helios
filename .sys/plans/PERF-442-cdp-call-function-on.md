---
id: PERF-442
slug: cdp-call-function-on
status: unclaimed
claimed_by: ""
created: 2025-05-24
completed: ""
result: ""
---

# PERF-442: Replace `Runtime.evaluate` with `Runtime.callFunctionOn` to Eliminate Chromium V8 Parse Overhead

## Focus Area
DOM Rendering Time Synchronization (`SeekTimeDriver.ts`).

## Background Research
Currently, `SeekTimeDriver.ts` advances the DOM virtual time by dynamically constructing a JavaScript string:
`'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')'`
It then sends this string to Chromium via `Runtime.evaluate`.
Because the string changes on every frame (due to `timeInSeconds` changing), Chromium's V8 engine cannot cache the parsed AST. It must lex, parse, compile, and execute a brand new script for every single frame across all execution contexts.

By switching from `Runtime.evaluate` to `Runtime.callFunctionOn`, we provide a static `functionDeclaration` (e.g., `function(t, timeout) { return window.__helios_seek(t, timeout); }`) and pass the `timeInSeconds` as a separate argument. Because the `functionDeclaration` string never changes, Chromium V8 can potentially cache the compiled function, and we only send the changing `value` in the `arguments` array over IPC. This eliminates per-frame script compilation overhead in the headless browser.

## Benchmark Configuration
- **Composition URL**: Standard `dom-benchmark`
- **Render Settings**: 1280x720, 30fps, 3s duration (90 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.45s
- **Bottleneck analysis**: Chromium V8 parsing and compiling dynamically generated JavaScript strings on every frame tick via `Runtime.evaluate`.

## Implementation Spec

### Step 1: Add Properties to SeekTimeDriver
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Replace `singleFrameEvaluateParams` and `multiFrameEvaluateParams` with `singleFrameCallParams` and `multiFrameCallParams`.

```typescript
  private singleFrameCallParams: any = {
    functionDeclaration: 'function(t, timeout) { return window.__helios_seek(t, timeout); }',
    arguments: [{ value: 0 }, { value: 30000 }],
    executionContextId: 0,
    awaitPromise: true,
    returnByValue: false
  };
  private multiFrameCallParams: any[] = [];
```

### Step 2: Update `prepare()`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Update the initialization in `prepare()` to set the correct timeout. Remove references to `singleFrameEvaluateParams` and `multiFrameEvaluateParams`.

```typescript
    this.singleFrameCallParams.arguments[1].value = this.timeout;

    // (Existing execution context fetching code remains the same)
```

### Step 3: Update `setTime()`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Update `setTime()` to use `Runtime.callFunctionOn`.

```typescript
  setTime(page: Page, timeInSeconds: number): Promise<void> | void {
    const frames = this.cachedFrames;

    if (frames.length === 1) {
      this.singleFrameCallParams.arguments[0].value = timeInSeconds;
      this.singleFrameCallParams.executionContextId = this.executionContextIds[0];
      return this.cdpSession!.send('Runtime.callFunctionOn', this.singleFrameCallParams) as unknown as Promise<void>;
    }

    this.multiFramePromises.length = this.executionContextIds.length;
    if (this.multiFrameCallParams.length !== this.executionContextIds.length) {
      this.multiFrameCallParams.length = this.executionContextIds.length;
      for (let i = 0; i < this.executionContextIds.length; i++) {
        this.multiFrameCallParams[i] = {
          functionDeclaration: 'function(t, timeout) { return window.__helios_seek(t, timeout); }',
          arguments: [{ value: 0 }, { value: this.timeout }],
          executionContextId: this.executionContextIds[i],
          awaitPromise: true,
          returnByValue: false
        };
      }
    }
    for (let i = 0; i < this.executionContextIds.length; i++) {
      this.multiFrameCallParams[i].arguments[0].value = timeInSeconds;
      this.multiFrameCallParams[i].executionContextId = this.executionContextIds[i];
      this.multiFramePromises[i] = this.cdpSession!.send('Runtime.callFunctionOn', this.multiFrameCallParams[i]);
    }
    return Promise.all(this.multiFramePromises) as unknown as Promise<void>;
  }
```

**Why**: By sending a static `functionDeclaration` and passing arguments, Chromium avoids lexing and compiling a new JS string on every frame.
**Risk**: Negligible risk. `executionContextId` logic already matches what Playwright does internally for evaluate.

## Canvas Smoke Test
Run the standard tests to verify the canvas path isn't broken.

## Correctness Check
Run the `scripts/benchmark-test.js` script to ensure seeking still functions correctly.
