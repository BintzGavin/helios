---
id: PERF-394
slug: inline-begin-frame-screenshot
status: complete
claimed_by: ""
created: 2024-05-30
completed: ""
result: "improved"
---

# PERF-394: Inline beginFrame Screenshot

## Focus Area
`DomStrategy.ts` uses Playwright's `Page.startScreencast` and listens to `Page.screencastFrame` events to capture frames. This decouples the screenshot request from the response, requiring event listener mapping, promise allocation, and a separate IPC `Page.screencastFrameAck` command. We should test replacing this by passing the `screenshot` parameter directly to `HeadlessExperimental.beginFrame`.

## Background Research
In Playwright CDP, calling `HeadlessExperimental.beginFrame` with the `screenshot: { format: 'png' }` parameter directly returns the frame's `screenshotData` as a base64 string. By leveraging this, we can eliminate the need to listen for separate `Page.screencastFrame` events entirely. This avoids allocating a new `Promise` and anonymous closure per frame, saves the IPC roundtrip for `screencastFrameAck`, and drastically simplifies the pipeline.

## Benchmark Configuration
- **Composition URL**: Any standard DOM test
- **Render Settings**: Standard benchmark settings
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: IPC overhead from `Page.screencastFrameAck` and V8 GC churn from `new Promise` allocation on every single frame in the hot loop.

## Implementation Spec

### Step 1: Remove Screencast Logic
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Delete class properties: `screencastPromiseResolver`, `ackParams`, and `screencastPromiseExecutor`.
2. In `prepare()`, delete the `Page.screencastFrame` event listener block.
3. In `prepare()`, delete the `this.cdpSession!.send('Page.startScreencast', ...)` call.
**Why**: These are no longer needed since we will fetch screenshot data synchronously with the beginFrame tick.

### Step 2: Add Screenshot Param to beginFrame
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Update the type of `beginFrameParams` property to `any` and add `screenshot: null`.
2. In `prepare()`, set `this.beginFrameParams.screenshot = cdpScreenshotParams;`.
**Why**: Configures `beginFrame` to capture and return the screenshot.

### Step 3: Extract Data in capture()
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Replace the `const promise = new Promise...` and `await promise` logic with:
```typescript
    this.beginFrameParams.frameTimeTicks = 10000 + frameTime;
    const result: any = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams).catch(() => ({}));

    const frameData = result.screenshotData || this.lastFrameData!;
    this.lastFrameData = frameData;
    return frameData;
```
**Why**: Awaits the `beginFrame` call directly to get the `screenshotData`, avoiding event listeners and simplifying control flow.

## Variations
None.

## Canvas Smoke Test
N/A

## Correctness Check
Run targeted script `cd packages/renderer && npx tsx tests/verify-dom-strategy-capture.ts`.
