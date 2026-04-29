---
id: PERF-384
slug: eliminate-promise-chain-seek-time-driver
status: complete
claimed_by: "executor"
created: 2026-04-29
completed: ""
result: ""
---

# PERF-384: Eliminate Promise chain allocation in SeekTimeDriver

## Focus Area
`packages/renderer/src/drivers/SeekTimeDriver.ts` - `setTime` hot loop.

## Background Research
In `SeekTimeDriver.ts` (used for `dom` mode rendering), the `setTime()` method sends a `Runtime.evaluate` command to the browser. Currently, it appends a `.then(() => {})` handler to the Playwright CDP Promise to fulfill the `Promise<void> | void` return type. This dynamically allocates a new Promise instance and an anonymous closure `() => {}` on the V8 heap for every single frame during the renderer loop. By returning the CDP Promise directly and casting it, we can eliminate these micro-allocations on the Node.js event loop while maintaining strict synchronization.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition.
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10 duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~36.336s
- **Bottleneck analysis**: Micro-allocations of anonymous closures and chained Promises on the Node.js heap per frame in `SeekTimeDriver.setTime()`.

## Implementation Spec

### Step 1: Remove `.then(() => {})` in `SeekTimeDriver.ts`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In `setTime()`, remove `.then(() => {})` from both the single-frame and multi-frame branches and cast the return value.

Change the single-frame block from:
```typescript
    if (frames.length === 1) {
      return this.cdpSession!.send('Runtime.evaluate', {
        expression: 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')',
        awaitPromise: true
      }).then(() => {});
    }
```
To:
```typescript
    if (frames.length === 1) {
      return this.cdpSession!.send('Runtime.evaluate', {
        expression: 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')',
        awaitPromise: true
      }) as unknown as Promise<void>;
    }
```

Change the multi-frame block from:
```typescript
    return Promise.all(promises).then(() => {});
```
To:
```typescript
    return Promise.all(promises) as unknown as Promise<void>;
```

**Why**: Eliminates the V8 heap allocation of a new Promise and an anonymous closure on every single frame loop.
**Risk**: Negligible. The `CaptureLoop` awaits the returned promise, and it does not use the resolved value (whether it resolves to `{ result: ... }` or `void`).

## Variations
None.

## Canvas Smoke Test
Run `cd packages/renderer && npm run test` or check canvas rendering, though this change strictly isolates to `SeekTimeDriver` used in DOM mode.

## Correctness Check
Run `cd packages/renderer && npx tsx tests/verify-dom-strategy-capture.ts` to ensure frames capture correctly without hanging.

## Prior Art
- `PERF-375`: Removed `await` entirely from `CdpTimeDriver.ts` sync media calls.
- `PERF-343`: Removed array and closure allocations from `Promise.race`.
