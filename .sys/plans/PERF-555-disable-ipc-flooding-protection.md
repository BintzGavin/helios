---
id: PERF-555
slug: disable-ipc-flooding-protection
status: claimed
claimed_by: "executor-session"
created: 2024-05-31
completed: 2024-06-01
result: no-improvement
---

# PERF-555: Disable Chromium IPC Flooding Protection

## Focus Area
Chromium Launch Arguments (`BrowserPool.ts`).

## Background Research
During headless DOM rendering, the `BrowserPool` controls the Chromium instance. We are currently utilizing `--single-process` to limit multi-process overhead, but the hot loop of the renderer relies on high-frequency, bidirectional CDP commands (IPC) using `Runtime.evaluate` and `HeadlessExperimental.beginFrame`. Chromium includes built-in safeguards like IPC flooding protection and hang monitors to throttle or reject excessive IPC messages, which can introduce microscopic delays or processing overhead when flooded with commands as quickly as Node.js can await them. These flags (`--disable-ipc-flooding-protection` and `--disable-hang-monitor`) are actually used internally by `playwright-core`'s default launcher, but when we construct our own arguments array with a custom executable path via `chrome-headless-shell`, they might not be applied by default.
By explicitly adding `--disable-ipc-flooding-protection` and `--disable-hang-monitor` to the `DEFAULT_BROWSER_ARGS`, we may ensure we bypass this throttling logic entirely, allowing the high-frequency CDP commands to be processed with maximum throughput.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1920x1080, 60fps, 10s duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~10.002s
- **Bottleneck analysis**: Potential IPC latency and throttling overhead within the Chromium main thread during the high-frequency `beginFrame` capture loop.

## Implementation Spec

### Step 1: Add `--disable-ipc-flooding-protection` and `--disable-hang-monitor` to browser args
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**: Add `'--disable-ipc-flooding-protection'` and `'--disable-hang-monitor'` to the `DEFAULT_BROWSER_ARGS` array.
**Why**: Explicitly disables Chromium's internal IPC message throttling and hang detection mechanisms, which might be artificially slowing down or analyzing our high-frequency CDP command pipeline.
**Risk**: Minimal. This is a trusted local microVM environment; we are intentionally flooding IPC, so removing the protection is conceptually correct and safe.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- --run` to ensure the flags do not break Chromium initialization or basic canvas rendering.

## Correctness Check
Run `npm run test -w packages/renderer -- --run` to verify DOM output correctly resolves without regressions.

## Results Summary
- **Best render time**: 10.851s (vs baseline 10.002s)
- **Improvement**: -8.5%
- **Kept experiments**:
- **Discarded experiments**: `--disable-ipc-flooding-protection` and `--disable-hang-monitor` in BrowserPool.ts
