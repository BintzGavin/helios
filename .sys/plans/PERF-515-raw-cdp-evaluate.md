---
id: PERF-515
slug: raw-cdp-evaluate
status: complete
claimed_by: ""
created: 2024-05-16
completed: ""
result: ""
---

# PERF-515: Bypass Playwright Evaluate

## Focus Area
`CdpTimeDriver.ts`. We want to test replacing the Playwright `page.evaluate()` / `frame.evaluate()` calls used for synchronizing media elements and Virtual Time stability checks with a direct raw CDP `Runtime.evaluate` invocation to eliminate Playwright's intermediate Promise allocation, evaluation wrapper, and IPC serialization overhead inside the 600-frame hot loop.

## Background Research
Playwright's `page.evaluate()` runs significant internal machinery, including allocating multiple wrapper Promises, injecting utility scripts, tracking execution contexts, and handling errors. Because `CdpTimeDriver.runSetTime()` runs inside the hottest part of the DOM capture loop (executed thousands of times per render), this Playwright overhead adds up. By interacting directly with the V8 runtime via the raw CDP session `Runtime.evaluate`, we can bypass Playwright entirely for our injected stability/media synchronization script. In `CdpTimeDriver.ts`, this was already partially done for some evaluate calls, but `frame.evaluate()` is still used as a fallback if `executionContextIds` are not populated correctly (which happens if `Runtime.enable()` is called too late or execution contexts aren't cached).

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~16.5s
- **Bottleneck analysis**: Secondary V8 Promise allocations and IPC wrappers inside `CdpTimeDriver.runSetTime()` and `defaultSyncMedia`.

## Implementation Spec

### Step 1: Ensure executionContextIds are robustly fetched
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In `prepare()`, if `this.executionContextIds.length === 0`, instead of relying on `frame.evaluate` later, explicitly fetch execution context IDs via a CDP query or rely strictly on `Runtime.evaluate` without context IDs (which defaults to the main frame).

### Step 2: Remove `frame.evaluate` fallback
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In `defaultSyncMedia()`, remove the fallback block:
```typescript
        } else {
          for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            frame.evaluate("if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");");
          }
        }
```
And replace it with a single `Runtime.evaluate` on the main frame, or ensure the execution contexts are always valid. The overhead of calling Playwright's `frame.evaluate` in the hot loop is what we want to avoid.
**Why**: Direct CDP avoids Playwright's execution tracking.

## Canvas Smoke Test
Run a basic canvas render (`mode: 'canvas'`) to ensure the renderer doesn't crash on Canvas strategies where this driver isn't used.

## Correctness Check
Verify the rendered output video to ensure the parallel frame captures are still ordered and visually correct.
