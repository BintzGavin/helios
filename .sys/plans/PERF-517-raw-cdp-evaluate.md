---
id: PERF-517
slug: raw-cdp-evaluate
status: complete
claimed_by: "executor-session"
created: 2024-05-16
completed: 2024-05-16
result: no-improvement
---

# PERF-517: Bypass Playwright Evaluate

## Focus Area
`CdpTimeDriver.ts`. We want to test replacing the Playwright `frame.evaluate()` calls used for synchronizing media elements and Virtual Time stability checks with a direct raw CDP `Runtime.evaluate` invocation to eliminate Playwright's intermediate Promise allocation, evaluation wrapper, and IPC serialization overhead inside the 600-frame hot loop.

## Background Research
Playwright's `frame.evaluate()` runs significant internal machinery, including allocating multiple wrapper Promises, injecting utility scripts, tracking execution contexts, and handling errors. Because `CdpTimeDriver.runSetTime()` runs inside the hottest part of the DOM capture loop (executed thousands of times per render), this Playwright overhead adds up. By interacting directly with the V8 runtime via the raw CDP session `Runtime.evaluate`, we can bypass Playwright entirely for our injected stability/media synchronization script. In `CdpTimeDriver.ts`, this was already partially done for some evaluate calls, but `frame.evaluate()` is still used as a fallback.

## Benchmark Configuration
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
<<<<<<< SEARCH
          for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            frame.evaluate("if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");");
          }
=======
          this.singleFrameSyncMediaParams.expression = "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");";
          this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams);
>>>>>>> REPLACE
```

**Why**: Direct CDP avoids Playwright's execution tracking, bypassing intermediate Promises.

## Results Summary
- **Best render time**: 17.981s (vs baseline 17.687s)
- **Improvement**: 0% (discarded)
- **Kept experiments**: []
- **Discarded experiments**: [PERF-517: Replace `frame.evaluate` with `Runtime.evaluate`]
