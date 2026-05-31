---
id: PERF-630
slug: bypass-last-frame-data-assignment
status: complete
claimed_by: "executor-session"
created: 2024-06-05
completed: "2026-05-31"
result: failed
---

# PERF-630: Bypass `lastFrameData` State Tracking in `DomStrategy` Hot Loop

## Focus Area
`DomStrategy.ts` hot loop - specifically `capture()` method during CDP `beginFrame` calls.

## Background Research
Currently, the `capture()` method tracks the result of every frame to provide a fallback:
```typescript
  async capture(page: Page, frameTime: number): Promise<Buffer | string> {
    try {
      const result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
      if (result.screenshotData) {
        this.lastFrameData = result.screenshotData;
      }
      return this.lastFrameData!;
    } catch (e) {
      return this.lastFrameData!;
    }
  }
```
In our current pipeline, we do not use `noDisplayUpdates: true` during frame captures. This means Chromium is forced to compute a visual update and return `screenshotData` on every valid `beginFrame` execution. The `if (result.screenshotData)` check and `this.lastFrameData` property mutation are executed sequentially per frame, tracking state that is already effectively guaranteed or handled by the top-level catch handler.

By bypassing the conditional and property mutation, we can directly return the fast-path result, reducing object property mutation overhead in V8 and avoiding branch evaluation in the tightest part of the renderer.

## Baseline
- **Current estimated render time**: ~2.5s (in microVM baseline)
- **Bottleneck analysis**: Unnecessary object property mutations and branch evaluation per frame.

## Implementation Spec

### Step 1: Remove `lastFrameData` Assignment in `capture`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Replace:
```typescript
      if (result.screenshotData) {
        this.lastFrameData = result.screenshotData;
      }
      return this.lastFrameData!;
```
With:
```typescript
      return result.screenshotData || this.lastFrameData!;
```
**Why**: Avoids mutating `this.lastFrameData` on every single frame. The fallback `|| this.lastFrameData!` ensures we still return a valid buffer (which initializes to `this.emptyImageBase64`) if Chromium somehow omits the screenshot data.
**Risk**: Very low.

## Canvas Smoke Test
Not applicable to Canvas.

## Correctness Check
Run renderer tests `npm run test -w packages/renderer`.

## Results Summary
- **Best render time**: N/A
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [PERF-630]
