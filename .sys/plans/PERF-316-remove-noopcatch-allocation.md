---
id: PERF-316
slug: remove-noopcatch-allocation
status: unclaimed
claimed_by: ""
created: 2025-04-19
completed: ""
result: ""
---

# PERF-316: Avoid Promise Allocation Overhead in SeekTimeDriver's Catch Handlers

## Focus Area
DOM Rendering Pipeline - Frame Capture Loop Hot Path in `SeekTimeDriver.ts`

## Background Research
In `PERF-314`, we modified `SeekTimeDriver.setTime()` to attach `.catch(() => {})` inline to the CDP evaluate promises. However, inline functions inside a hot loop (like `() => {}`) allocate a new closure on every execution. In the context of `CaptureLoop.ts` firing many evaluate requests, this creates unnecessary V8 garbage collection overhead.

We can optimize this by defining a static `noopCatch` function at the module level or inside the class, and passing that reference to `.catch()`. This entirely avoids dynamic function allocation for error handlers in the single-process hot loop.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: Baseline identical settings across all runs
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~47.5s
- **Bottleneck analysis**: The cost of executing anonymous closure allocations `() => {}` in the hot loop when catching unobserved promise rejections.

## Implementation Spec

### Step 1: Pre-allocate static no-op catch handler
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In `SeekTimeDriver.ts`, introduce a top-level `noopCatch` function and replace the inline arrow function.

```typescript
<<<<<<< SEARCH
import { Page, CDPSession, Frame } from 'playwright';
import { TimeDriver } from './TimeDriver.js';
import { FIND_ALL_SCOPES_FUNCTION, FIND_ALL_MEDIA_FUNCTION } from '../utils/dom-scanner.js';
import { SYNC_MEDIA_FUNCTION, PARSE_MEDIA_ATTRIBUTES_FUNCTION } from '../utils/media-sync.js';
=======
import { Page, CDPSession, Frame } from 'playwright';
import { TimeDriver } from './TimeDriver.js';
import { FIND_ALL_SCOPES_FUNCTION, FIND_ALL_MEDIA_FUNCTION } from '../utils/dom-scanner.js';
import { SYNC_MEDIA_FUNCTION, PARSE_MEDIA_ATTRIBUTES_FUNCTION } from '../utils/media-sync.js';

const noopCatch = () => {};
>>>>>>> REPLACE
```

Then in `setTime`:

```typescript
<<<<<<< SEARCH
    for (let i = 0; i < this.executionContextIds.length; i++) {
      this.cdpSession!.send('Runtime.evaluate', {
        expression: expression,
        contextId: this.executionContextIds[i],
        awaitPromise: true
      }).catch(() => {});
    }
=======
    for (let i = 0; i < this.executionContextIds.length; i++) {
      this.cdpSession!.send('Runtime.evaluate', {
        expression: expression,
        contextId: this.executionContextIds[i],
        awaitPromise: true
      }).catch(noopCatch);
    }
>>>>>>> REPLACE
```

**Why**: By pre-allocating the `noopCatch` closure, we prevent V8 from instantiating a new function reference for every execution context on every frame. This reduces GC pressure in the hot loop.
**Risk**: None. It's a standard V8 GC optimization.

## Variations
None.

## Canvas Smoke Test
None needed. SeekTimeDriver is for DOM mode.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` or other tests to ensure it still runs correctly.
