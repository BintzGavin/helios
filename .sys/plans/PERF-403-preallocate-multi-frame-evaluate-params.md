---
id: PERF-403
slug: preallocate-multi-frame-evaluate-params
status: unclaimed
claimed_by: ""
created: 2024-06-03
completed: ""
result: ""
---

# PERF-403: Preallocate multi-frame evaluate params array in SeekTimeDriver

## Focus Area
The multi-frame hot path in `SeekTimeDriver.ts` `setTime()` dynamic allocation of parameter objects for `Runtime.evaluate`.

## Background Research
In `SeekTimeDriver.ts`, the multi-frame code path inside `setTime` iterates over all execution contexts to synchronize the document timeline and media elements. For each execution context, it dynamically allocates a new object literal:
```typescript
this.multiFramePromises[i] = this.cdpSession!.send('Runtime.evaluate', {
  expression,
  contextId: this.executionContextIds[i],
  awaitPromise: true
});
```
Creating these short-lived objects on every frame generates V8 garbage collection pressure. As learned in `PERF-402` for `CdpTimeDriver`, we can safely preallocate an **array of distinct parameter objects**, one for each execution context! Since the `executionContextIds` array only grows, we can maintain an array of `multiFrameEvaluateParams`, assigning each one its permanent `contextId`. In the hot loop, we only update the `expression` property on the preallocated object corresponding to that frame, avoiding object allocation while completely mitigating the asynchronous mutation race condition.

## Benchmark Configuration
- **Composition URL**: Any multi-frame DOM composition (e.g., `tests/verify-iframe-sync.ts`)
- **Render Settings**: Standard benchmark settings
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Micro-allocations of `{ expression, contextId, awaitPromise }` objects inside the multi-frame `for` loop in `SeekTimeDriver.ts` cause V8 GC pressure.

## Implementation Spec

### Step 1: Preallocate `multiFrameEvaluateParams` array
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Run the following node script to define the property, initialize the array, and mutate it instead of allocating.
```bash
cat << 'EOF2' > patch.js
const fs = require('fs');
const path = 'packages/renderer/src/drivers/SeekTimeDriver.ts';
let code = fs.readFileSync(path, 'utf8');

// Step 1: Add property
code = code.replace(
  "private singleFrameEvaluateParams: any = { expression: '', awaitPromise: true };",
  "private singleFrameEvaluateParams: any = { expression: '', awaitPromise: true };\n  private multiFrameEvaluateParams: any[] = [];"
);

// Step 2 & 3: Initialization and Mutate
const targetInnerLoop = `    for (let i = 0; i < this.executionContextIds.length; i++) {
      this.multiFramePromises[i] = this.cdpSession!.send('Runtime.evaluate', {
        expression,
        contextId: this.executionContextIds[i],
        awaitPromise: true
      });
    }`;

const replacementInnerLoop = `    if (this.multiFrameEvaluateParams.length !== this.executionContextIds.length) {
      this.multiFrameEvaluateParams.length = this.executionContextIds.length;
      for (let i = 0; i < this.executionContextIds.length; i++) {
        this.multiFrameEvaluateParams[i] = {
          expression: "",
          contextId: this.executionContextIds[i],
          awaitPromise: true
        };
      }
    }
    for (let i = 0; i < this.executionContextIds.length; i++) {
      this.multiFrameEvaluateParams[i].expression = expression;
      this.multiFramePromises[i] = this.cdpSession!.send('Runtime.evaluate', this.multiFrameEvaluateParams[i]);
    }`;

code = code.replace(targetInnerLoop, replacementInnerLoop);
fs.writeFileSync(path, code);
EOF2
node patch.js
rm patch.js
```

### Step 2: Verification
**What to change**:
Verify the file was written correctly by running:
```bash
grep -A 20 "multiFrameEvaluateParams" packages/renderer/src/drivers/SeekTimeDriver.ts
```

**Why**: Completely eliminates the dynamic allocation of the parameter object literal inside the hot loop. By having a separate parameter object per `contextId`, we avoid async mutation race conditions without paying the penalty of inline object allocation.
**Risk**: None. The logic mirrors the multi-frame Promise array preallocation used in `PERF-402`.

## Variations
None.

## Correctness Check
Run targeted script `(cd packages/renderer && npx tsx tests/verify-iframe-sync.ts)`.
