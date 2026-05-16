---
id: PERF-516
slug: raw-cdp-evaluate
status: unclaimed
claimed_by: ""
created: 2024-05-16
completed: ""
result: ""
---

# PERF-516: Bypass Playwright Evaluate

## Focus Area
`CdpTimeDriver.ts`. We want to test replacing the Playwright `frame.evaluate()` calls used for synchronizing media elements and Virtual Time stability checks with a direct raw CDP `Runtime.evaluate` invocation to eliminate Playwright's intermediate Promise allocation, evaluation wrapper, and IPC serialization overhead inside the 600-frame hot loop.

## Background Research
Playwright's `frame.evaluate()` runs significant internal machinery, including allocating multiple wrapper Promises, injecting utility scripts, tracking execution contexts, and handling errors. Because `CdpTimeDriver.runSetTime()` runs inside the hottest part of the DOM capture loop (executed thousands of times per render), this Playwright overhead adds up. By interacting directly with the V8 runtime via the raw CDP session `Runtime.evaluate`, we can bypass Playwright entirely for our injected stability/media synchronization script. In `CdpTimeDriver.ts`, this was already partially done for some evaluate calls, but `frame.evaluate()` is still used as a fallback.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~0.612s (Current best from RENDERER-EXPERIMENTS.md, specific baseline for this experiment will be established during execution).
- **Bottleneck analysis**: Secondary V8 Promise allocations and IPC wrappers inside `CdpTimeDriver.runSetTime()`.

## Implementation Spec

### Step 1: Replace fallback `frame.evaluate` with a raw `Runtime.evaluate`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Locate the `else` block containing `frame.evaluate("if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");");` and replace it entirely with a raw CDP evaluation on the main frame.

Specifically, change it to:
```typescript
        } else {
          this.client!.send('Runtime.evaluate', { expression: "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");" });
        }
```

**Why**: Direct CDP avoids Playwright's execution tracking, bypassing intermediate Promises.

### Step 2: Ensure tests run correctly
Run tests locally to ensure there are no regressions. Use the specific renderer workspace tests script `npm run test -w packages/renderer -- --run` to confirm.

### Step 3: Complete pre commit steps
Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.

### Step 4: Submit change
Submit change, PR creation.