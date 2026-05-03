---
id: PERF-429
slug: inline-object-allocation
status: complete
claimed_by: "executor-session"
created: 2026-05-03
completed: "2024-05-03"
result: "discard"
---

# PERF-429: Inline object literal allocation for `HeadlessExperimental.beginFrame` and `Runtime.evaluate`

## Context & Goal
In `PERF-348-inline-object-allocation-beginframe.md`, it was discovered that using inline object literal allocation for `HeadlessExperimental.beginFrame` and `Runtime.evaluate` on Playwright CDP connections improved render time over mutating a cached object in a tight loop. However, this optimization was lost in subsequent changes that reverted to mutating class properties (e.g., `this.beginFrameParams`, `this.singleFrameSyncMediaParams`, `this.singleFrameEvaluateParams`, `this.setVirtualTimePolicyParams`). The goal is to restore this optimization to achieve lower render times.

## File Inventory
- `packages/renderer/src/strategies/DomStrategy.ts`
- `packages/renderer/src/drivers/SeekTimeDriver.ts`
- `packages/renderer/src/drivers/CdpTimeDriver.ts`

## Implementation Spec

### Architecture
The architecture remains the same, but the method of allocating parameters for CDP commands is changed from reusing long-lived class properties to using inline object literals.

### Pseudo-Code
**In `DomStrategy.ts`:**
Remove `beginFrameParams`.
In `capture()`:
```typescript
result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', {
  screenshot: cdpScreenshotParams,
  interval: this.frameInterval,
  frameTimeTicks: 10000 + frameTime
});
```

**In `SeekTimeDriver.ts`:**
Remove `singleFrameEvaluateParams`.
In `setTime()`:
```typescript
return this.cdpSession!.send('Runtime.evaluate', {
  expression: 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')',
  awaitPromise: true
}) as unknown as Promise<void>;
```

**In `CdpTimeDriver.ts`:**
Remove `singleFrameSyncMediaParams` and `setVirtualTimePolicyParams`.
In `runSetTime()`:
```typescript
this.client!.send('Runtime.evaluate', {
  expression: "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");",
  awaitPromise: false
});
// ...
this.client!.send('Emulation.setVirtualTimePolicy', {
  policy: 'advance',
  budget: budget
}).catch(this.handleVirtualTimeBudgetError);
```

### Public API Changes
None.

### Dependencies
None.

## Test Plan
- Run `npx --prefix packages/renderer tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to ensure frames capture correctly without hanging.

## Results Summary
- **Best render time**: 32.231s (vs baseline 32.146s)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [Inline object literal allocation for CDP commands]
