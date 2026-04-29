---
id: PERF-386
slug: eliminate-promise-chain-cdptimedriver
status: unclaimed
claimed_by: ""
created: 2024-05-18
completed: ""
result: ""
---

# PERF-386: Eliminate Promise Chain in CdpTimeDriver

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts` - `runSetTime` method stability check.

## Background Research
In `CdpTimeDriver.ts`, the stability check creates a Promise chain:
`const evaluatePromise = this.client!.send('Runtime.evaluate', this.evaluateStabilityParams).then(this.handleStabilityCheckResponse);`
This dynamically allocates an anonymous closure on the event loop for the `.then` callback, contributing to V8 garbage collection churn during the hot loop on every frame. A previous experiment, `PERF-384`, successfully eliminated similar `.then` Promise chain allocations in `SeekTimeDriver.ts` by returning the CDP promise directly and avoiding the anonymous callback. The same optimization applies here by awaiting the raw evaluate promise directly and handling the response synchronously after the race completes.

## Benchmark Configuration
- **Mode**: `canvas`

## Baseline
- **Bottleneck analysis**: Micro-allocations on the event loop due to `.then()` promise chaining inside the hot loop.

## Implementation Spec

### Step 1: Eliminate `.then()` chaining
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Remove the `.then(this.handleStabilityCheckResponse)` call from `evaluatePromise`. Race the raw CDP promise directly.

Change:
```typescript
    const evaluatePromise = this.client!.send('Runtime.evaluate', this.evaluateStabilityParams).then(this.handleStabilityCheckResponse);

    const timeoutPromise = new Promise<void>(this.stabilityTimeoutExecutor);

    try {
        await Promise.race([evaluatePromise, timeoutPromise]);
    } catch (e: any) {
```
To:
```typescript
    const evaluatePromise = this.client!.send('Runtime.evaluate', this.evaluateStabilityParams);

    const timeoutPromise = new Promise<void>(this.stabilityTimeoutExecutor);

    try {
        const res = await Promise.race([evaluatePromise, timeoutPromise]);
        if (res) {
          this.handleStabilityCheckResponse(res);
        }
    } catch (e: any) {
```
**Why**: Avoids dynamic allocation of V8 Promise resolution handlers (`.then`) on every single frame.
**Risk**: Minor type handling considerations when racing a `Promise<void>` against a `Promise<any>`. The `timeoutPromise` rejects on timeout, so `res` will only be defined if `evaluatePromise` wins and resolves successfully.

## Variations
None.

## Correctness Check
Run `cd packages/renderer && npx tsx tests/verify-dom-strategy-capture.ts`.

## Prior Art
- `PERF-384`: Eliminated Promise chain allocation in `SeekTimeDriver.setTime`.
