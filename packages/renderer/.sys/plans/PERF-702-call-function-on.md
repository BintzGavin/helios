---
status: complete
claimed_by: "executor-session"
---

# PERF-702: Optimize CDP Send Parameters in SeekTimeDriver.ts

## 1. Description
Optimize `SeekTimeDriver.ts` by using `Runtime.callFunctionOn` instead of `Runtime.evaluate` with string concatenation in the hot loop. This avoids repeated JavaScript string allocation and garbage collection overhead.

## 2. Update `packages/renderer/src/drivers/SeekTimeDriver.ts`
Modify `setTime` and property declarations in `SeekTimeDriver.ts`.

Replace:
```typescript
  private singleFrameEvaluateParams: any = { expression: '', awaitPromise: true, returnByValue: false };
```

With:
```typescript
  private singleFrameCallParams: any = {
    functionDeclaration: 'function(t, ms) { return window.__helios_seek(t, ms); }',
    arguments: [{ value: 0 }, { value: 0 }],
    executionContextId: undefined,
    awaitPromise: true,
    returnByValue: false
  };
```

Update the constructor to set `this.singleFrameCallParams.arguments[1].value = timeout;`.

Modify `setTime`:
```typescript
  setTime(page: Page, timeInSeconds: number): Promise<void> | void {
    const frames = this.cachedFrames;

    if (frames.length === 1) {
      this.singleFrameCallParams.arguments[0].value = timeInSeconds;
      this.singleFrameCallParams.executionContextId = this.executionContextIds[0];
      return this.cdpSession!.send('Runtime.callFunctionOn', this.singleFrameCallParams) as unknown as Promise<void>;
    }

    this.multiFramePromises.length = this.executionContextIds.length;
    if (this.multiFrameEvaluateParams.length !== this.executionContextIds.length) {
      this.multiFrameEvaluateParams.length = this.executionContextIds.length;
      for (let i = 0; i < this.executionContextIds.length; i++) {
        this.multiFrameEvaluateParams[i] = {
          functionDeclaration: 'function(t, ms) { return window.__helios_seek(t, ms); }',
          arguments: [{ value: 0 }, { value: this.timeout }],
          executionContextId: this.executionContextIds[i],
          awaitPromise: true,
          returnByValue: false
        };
      }
    }
    for (let i = 0; i < this.executionContextIds.length; i++) {
      this.multiFrameEvaluateParams[i].arguments[0].value = timeInSeconds;
      this.multiFrameEvaluateParams[i].executionContextId = this.executionContextIds[i];
      this.multiFramePromises[i] = this.cdpSession!.send('Runtime.callFunctionOn', this.multiFrameEvaluateParams[i]);
    }
    return Promise.all(this.multiFramePromises) as unknown as Promise<void>;
  }
```

## 3. Benchmark
Run the standard benchmark harness in `packages/renderer/`.
If render time improves, keep the changes. If not, revert.

## 4. Complete pre commit steps
Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.

## 5. Submit
Once all tests pass, submit the change with a descriptive commit message.


## Results Summary
- **Best render time**: 2.236s (vs baseline 2.166s)
- **Improvement**: -3.2%
- **Kept experiments**: None
- **Discarded experiments**: Optimize CDP Send Parameters in SeekTimeDriver.ts
