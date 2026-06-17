---
id: PERF-791
slug: consolidate-virtual-time
status: unclaimed
claimed_by: ""
created: 2024-06-17
completed: ""
result: ""
---

# PERF-791: Consolidate Virtual Time Advancement into beginFrame

## Focus Area
`CdpTimeDriver.ts` and `DomStrategy.ts`. The IPC message loop for virtual time progression and frame capture in `dom` mode.

## Background Research
Currently, per frame, the DOM capture pipeline performs two sequential CDP roundtrips in the Node.js hot loop:
1. `CdpTimeDriver` sends `Emulation.setVirtualTimePolicy` with a `budget` equivalent to the frame interval, and awaits the `virtualTimeBudgetExpired` event to ensure the browser has evaluated all CSS and JavaScript for that period.
2. `DomStrategy` sends `HeadlessExperimental.beginFrame` and awaits the screenshot response to capture the DOM state.

However, `DomStrategy` already populates `HeadlessExperimental.beginFrame` with an `interval` parameter (`this.beginFrameParams.interval = this.frameInterval`). According to the Chromium CDP documentation, providing `interval` to `beginFrame` when virtual time is paused will automatically advance the virtual time by that amount *before* capturing the frame.
Because `CdpTimeDriver` initially sets the policy to `pause`, the explicit `setVirtualTimePolicy` call in `setTime` is entirely redundant for `DomStrategy`. By skipping it when `mode === 'dom'`, we can consolidate virtual time advancement and frame capture into a single CDP command, halving the IPC roundtrip overhead per frame.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: IPC payload transfer and Chromium CDP router parsing overhead. Eliminating one full CDP cycle per frame should drastically improve throughput on the monomorphic fast path.

## Implementation Spec

### Step 1: Pass mode to CdpTimeDriver
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Modify the class constructor to accept the render mode:
```typescript
  private mode: string;
  constructor(timeout: number = 30000, mode: string = 'canvas') {
    this.timeout = timeout;
    this.mode = mode;
  }
```
**Why**: `CdpTimeDriver` is shared by both `canvas` and `dom` strategies. `CanvasStrategy` doesn't use `beginFrame` and still strictly requires explicit virtual time budgets. We only want to bypass explicit virtual time advancement when `DomStrategy` is active.

### Step 2: Skip explicit virtual time policy in DOM mode
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Modify `setTime` to bypass the `setVirtualTimePolicy` CDP command and immediately resolve the promise if the mode is `dom`.
Replace:
```typescript
    this.setVirtualTimePolicyParams.budget = delta * 1000;
    this.currentTime = timeInSeconds;
    this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams);
    return this.timePromise as any as Promise<void>;
```
With:
```typescript
    this.currentTime = timeInSeconds;

    if (this.mode === 'dom') {
      // DomStrategy's beginFrame will advance the virtual time via its 'interval' parameter
      return RESOLVED_PROMISE;
    }

    this.setVirtualTimePolicyParams.budget = delta * 1000;
    this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams);
    return this.timePromise as any as Promise<void>;
```

### Step 3: Update CdpTimeDriver Instantiation
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Locate the instantiation of `CdpTimeDriver`:
```typescript
const timeDriver = new CdpTimeDriver(this.options.stabilityTimeout);
```
Pass the `mode` parameter:
```typescript
const timeDriver = new CdpTimeDriver(this.options.stabilityTimeout, this.options.mode);
```

## Variations
N/A

## Correctness Check
Run the `dom` mode benchmark script (`npx tsx scripts/benchmark-perf.ts --mode dom`). Ensure the video plays back at the correct speed and duration, validating that the time steps are still progressing correctly.

## Canvas Smoke Test
Run the `canvas` mode benchmark script (`npx tsx scripts/benchmark-perf.ts --mode canvas`) to verify `canvas` pipelines still advance their clocks properly via the fallback.

## Prior Art
- PERF-769 (Minimize CDP Message Payloads) verified that reducing IPC traffic has compound benefits in the hot loop.
