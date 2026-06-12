---
id: PERF-751
slug: hoist-runtime
status: unclaimed
claimed_by: ""
created: 2025-05-24
completed: ""
result: ""
---

# PERF-751: Hoist Runtime.enable to DomStrategy.prepare()

## Focus Area
`DomStrategy.ts` and `CdpTimeDriver.ts` - Initialization and preparation phase. Eagerly enabling the CDP Runtime in `DomStrategy.prepare()` to avoid doing it later when it might compete with frame evaluation.

## Background Research
Currently, both `DomStrategy` and `CdpTimeDriver` share a CDP session. `DomStrategy` enables `HeadlessExperimental` during `prepare()`. Later, `CdpTimeDriver` conditionally calls `Runtime.enable` during its `prepare()` phase if media elements are detected (in the `if (this.hasMedia)` block).

PERF-739 attempted to enable `Runtime` inside `DomStrategy.prepare()`, but it regressed performance because it was enabled *before* adding and evaluating the preload scripts (like `PRELOAD_SCRIPT`). This competition between early internal CDP processing and Playwright's own `evaluate` logic likely caused the startup delay.

However, if we enable `Runtime` *after* the preload scripts have been evaluated and initialized, we might still gain the benefit of having `Runtime` ready earlier in the pipeline (before `CdpTimeDriver` even starts its checks), without interfering with the initial script execution.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition (`npm run benchmark -w packages/renderer`)
- **Render Settings**: 600x600, 60 FPS, 150 frames
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~26.385s (baseline from journal)
- **Bottleneck analysis**: The `CdpTimeDriver` conditionally awaits `Runtime.enable` if media elements are present. By hoisting this into the guaranteed earlier `DomStrategy.prepare()` phase (but *after* script evaluation), we can potentially overlap its initialization with other operations or remove the conditional await overhead from the time driver entirely.

## Implementation Spec

### Step 1: Hoist Runtime.enable into DomStrategy
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**: In `prepare()`, *after* the `evaluate` calls for the preload scripts and audio track scanning, add `await this.cdpSession!.send('Runtime.enable');` next to `await this.cdpSession!.send('HeadlessExperimental.enable');`.
**Why**: Ensures the Runtime domain is enabled early, but without interfering with initial script injection.
**Risk**: Might still cause a minor regression if CDP `Runtime` events clutter the session early on.

### Step 2: Remove Runtime.enable from CdpTimeDriver
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**: Remove the `await this.client!.send('Runtime.enable').catch(noopCatch);` line from the `if (this.hasMedia)` block in `prepare()`.
**Why**: It is already enabled by the `DomStrategy`, so we don't need to conditionally await it here. This removes an async operation from the initialization flow.
**Risk**: If `CdpTimeDriver` is used with a different strategy that doesn't enable `Runtime`, it might not receive `executionContextCreated` events. However, the DOM renderer pipeline tightly couples `DomStrategy` and `CdpTimeDriver` (or `SeekTimeDriver`), so this risk is acceptable for this experiment.
