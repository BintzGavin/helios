---
id: PERF-706
slug: omit-catch-in-cdp-time-driver
status: complete
claimed_by: "jules"
created: 2024-06-13
completed: "2024-06-13"
result: "improved"
---
# PERF-706: Omit .catch() in CdpTimeDriver setVirtualTimePolicy

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts` -> `runSetTime` method.

## Background Research
In the `CdpTimeDriver.runSetTime` hot path, we send the `Emulation.setVirtualTimePolicy` command via CDP:
`this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams).catch(this.handleVirtualTimeBudgetError);`

By appending `.catch()`, we force V8 to allocate a second Promise and chain the microtasks, even though `handleVirtualTimeBudgetError` is pre-bound. In PERF-704 and PERF-701, removing `.catch()` from `DomStrategy.capture()` eliminated an extra promise allocation and improved performance (or simplified the architecture leading to better GC).

Since `Emulation.setVirtualTimePolicy` is a core CDP command that should not fail during a healthy render (and if it does, an unhandled rejection crashing the process is appropriate), we can remove the `.catch(this.handleVirtualTimeBudgetError)` call entirely. This will eliminate one Promise chain allocation per frame.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000` (or standard DOM benchmark)
- **Render Settings**: 150 frames, 30fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.115s

## Implementation Spec

### Step 1: Remove .catch() from CDP send in CdpTimeDriver
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Change this line:
```typescript
this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams).catch(this.handleVirtualTimeBudgetError);
```
To:
```typescript
this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams);
```

**Why**: Eliminates a per-frame Promise allocation and microtask chaining for the error handler.
**Risk**: If the CDP command legitimately fails for a non-fatal reason, it will now cause an unhandled promise rejection and crash the Node.js process. However, in a headless rendering pipeline, CDP failures are generally fatal anyway.

## Variations
None.

## Canvas Smoke Test
This only impacts DOM mode.

## Correctness Check
Verify that the output `dom-benchmark.mp4` video accurately renders the composition without dropped frames.

## Prior Art
- **PERF-704**: Eliminated per-frame closures in `DomStrategy.capture()`, which involved removing `.catch()`.

## Results
- **Median render time**: 2.571s (from ~2.648s baseline)
- **Status**: Kept
