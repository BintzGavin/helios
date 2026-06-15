---
id: PERF-769
slug: minimize-cdp-payloads
status: complete
claimed_by: "jules"
created: 2024-06-15
completed: ""
result: "improved"
---

# PERF-769: Minimize CDP Message Payloads

## Focus Area
`CdpTimeDriver.ts` and `DomStrategy.ts` IPC message parameters.

## Background Research
The Node.js to Chromium CDP connection involves JSON serialization of message payloads on every frame. During the hot loop, `DomStrategy` sends `HeadlessExperimental.beginFrame` and `CdpTimeDriver` sends `Runtime.evaluate` and `Emulation.setVirtualTimePolicy`.
Currently, the cached parameter objects contain explicit boolean flags that match the default protocol values (e.g., `awaitPromise: false`, `returnByValue: false`, `noDisplayUpdates: false`).
By omitting these redundant properties from the cached objects, we reduce the total byte size of the JSON payload that needs to be stringified in V8, sent over the IPC pipe/WebSocket, and parsed by Chromium's CDP router per frame. For `Runtime.evaluate`, this cuts the payload size roughly in half. Over 150 frames, these micro-optimizations in string allocation and IPC transfer compound.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 150 frames, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.069s
- **Bottleneck analysis**: IPC payload serialization, transfer, and parsing overhead.

## Implementation Spec

### Step 1: Minimize `CdpTimeDriver` payload properties
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Change `private singleFrameSyncMediaParams: any = { expression: "window.__helios_sync_media();", awaitPromise: false, returnByValue: false };` to `private singleFrameSyncMediaParams: any = { expression: "window.__helios_sync_media();" };`
2. Inside `handleExecutionContextCreated`, when pushing to `multiFrameSyncMediaParams`, omit `awaitPromise` and `returnByValue`:
```typescript
      this.multiFrameSyncMediaParams.push({
          expression: "window.__helios_sync_media();",
          contextId: event.context.id
      });
```

### Step 2: Minimize `DomStrategy` payload properties
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Change `private beginFrameParams: any = { interval: 0, screenshot: null, noDisplayUpdates: false };` to `private beginFrameParams: any = {};`
2. In `prepare()`, change `this.beginFrameParams.interval = this.frameInterval;` to ensure we populate interval and screenshot directly onto the object dynamically.

**Why**: Smaller JSON payloads reduce V8 stringification time and Chromium parsing overhead.
**Risk**: If CDP protocol implementations vary and strictly require these booleans to be present (despite defaults being specified in the protocol docs), it might break. However, Chrome's CDP router correctly assumes default false values for missing optional boolean flags.

## Variations
None.

## Correctness Check
Run the DOM render benchmark script (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts`) to ensure it produces valid outputs without regressions.
