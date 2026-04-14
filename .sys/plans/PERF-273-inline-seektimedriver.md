---
id: PERF-273
slug: inline-seektimedriver-callParams
status: complete
claimed_by: "executor-session"
created: 2026-04-13
completed: "2026-04-13"
result: "kept"
---

# PERF-273: Optimize SeekTimeDriver CDP callParams assignment

## Focus Area
DOM Rendering Pipeline - `SeekTimeDriver.ts`. Specifically the hot loop in `setTime` where `this.callParams.arguments` is mutated.

## Background Research
In `SeekTimeDriver.ts`, the fast path (which handles the majority of simple DOM renders) does:
```typescript
    if (frames.length === 1 && this.callParams.objectId) {
      this.callParams.arguments[0].value = timeInSeconds;
      this.callParams.arguments[1].value = this.timeout;
      return this.cdpSession!.send('Runtime.callFunctionOn', this.callParams) as Promise<any>;
    }
```
In Playwright, `CDPSession.send()` stringifies the parameters to send over IPC. We mutate the nested array elements `this.callParams.arguments[0].value` and `[1].value`. Since `timeout` is constant for the duration of the driver (set during initialization), we don't need to pass it dynamically as an argument every frame!
We can inject `this.timeout` directly into the `functionDeclaration` string and remove the second argument entirely!
```typescript
    functionDeclaration: `function(t) { return this.__helios_seek(t, ${this.timeout}); }`,
```
This reduces the IPC payload size (fewer arguments to serialize) and simplifies the mutation inside `setTime`:
```typescript
      this.callParams.arguments[0].value = timeInSeconds;
```

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: 1280x720 resolution, 30 FPS, 3 seconds, `dom` mode
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: IPC payload size and object graph depth when serializing arguments for `Runtime.callFunctionOn` on every frame.

## Implementation Spec

### Step 1: Remove timeout argument from CDP callParams in `SeekTimeDriver`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In `SeekTimeDriver`, update `callParams` initialization in the constructor or class property to inline `this.timeout`:
Change the class property initialization to omit `functionDeclaration` and the second argument:
```typescript
  private callParams: any = {
    objectId: '',
    arguments: [ { value: 0 } ],
    awaitPromise: true,
    returnByValue: false
  };
```
Inside `prepare()`, right before retrieving the window objectId, populate `functionDeclaration`:
```typescript
    this.callParams.functionDeclaration = `function(t) { return this.__helios_seek(t, ${this.timeout}); }`;
```
Inside `setTime()`, remove the assignment to the second argument:
```typescript
    if (frames.length === 1 && this.callParams.objectId) {
      this.callParams.arguments[0].value = timeInSeconds;
      return this.cdpSession!.send('Runtime.callFunctionOn', this.callParams) as Promise<any>;
    }
```

**Why**: Reduces object mutation overhead and reduces the JSON IPC payload size for every frame sent over CDP.
**Risk**: Negligible.

## Variations
None.

## Canvas Smoke Test
Run a standard canvas benchmark to ensure no breakage.

## Correctness Check
Run the DOM benchmark tests and ensure the video renders.

## Results Summary
- **Best render time**: 32.267s (vs baseline 32.264s)
- **Improvement**: 0% (Cleaned up IPC payload serialization, performance difference is negligible).
- **Kept experiments**:
  - Inlined `this.timeout` into the `functionDeclaration` and omitted it from the `arguments` array inside the `SeekTimeDriver` CDP hot loop `Runtime.callFunctionOn` payload to marginally improve JSON stringification overhead in playwright.
- **Discarded experiments**: [none]
