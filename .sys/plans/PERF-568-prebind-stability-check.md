---
id: PERF-568
slug: prebind-stability-check
status: complete
claimed_by: "executor-session"
created: 2024-05-27
completed: 2024-05-27
result: no-improvement
---

# PERF-568: Prebind Stability Check to avoid branching in hot loop

## Focus Area
`CdpTimeDriver.ts` hot loop (`runSetTime`).

## Background Research
Currently, inside the `CdpTimeDriver` hot loop, we check `if (this.stabilityCheckState === 0)` on every single frame, even though it's only ever true on the very first frame. If it's true, we evaluate if the user's `waitUntilStable` function exists via a blocking CDP call and update the state to 1 or 2.

In PERF-461, we attempted to bypass this `Runtime.evaluate` by dynamically updating a function reference. However, the current code still retains the `if (this.stabilityCheckState === 0)` logic and subsequent `if (this.stabilityCheckState === 1)` logic inside `runSetTime()`.

While V8 branch prediction is highly optimized, moving this conditional check entirely out of the main hot loop execution path by using a state machine pattern (polymorphism/function reference update) removes the branching logic completely. We can define a dynamic method `checkStability(page, timeInSeconds)` that initially points to a "first-frame setup" function. Once that setup function determines if the stability check exists, it re-binds `this.checkStability` to either the actual stability check function or a no-op function. This ensures the hottest execution path is branch-free for stability checks after the first frame.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, 60fps, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~9.980s
- **Bottleneck analysis**: Unnecessary branching in the V8 hot path loop (`runSetTime`).

## Implementation Spec

### Step 1: Implement branchless stability check state machine
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove `private stabilityCheckState: number = 0;`.
2. Add a new property: `private performStabilityCheck: () => Promise<void> | void;`
3. In `constructor()`, or inline, initialize it: `this.performStabilityCheck = this.initialStabilityCheck.bind(this);`
4. In `prepare()`, reset it (in case the driver is reused): `this.performStabilityCheck = this.initialStabilityCheck.bind(this);`
5. Create `private async initialStabilityCheck(): Promise<void>` which executes the `stabilityCheckState === 0` logic. Inside, if `result.value` is true, re-assign `this.performStabilityCheck = this.executeStabilityCheck.bind(this);`. Else, re-assign `this.performStabilityCheck = () => {};`. Finally, call `this.performStabilityCheck()` at the end of `initialStabilityCheck` to evaluate the first frame.
6. Create `private async executeStabilityCheck(): Promise<void>` which does the `Runtime.evaluate` of `evaluateStabilityParams`.
7. In `runSetTime`, replace the entire `if (this.stabilityCheckState === 0)` and `if (this.stabilityCheckState === 1)` block with `await this.performStabilityCheck();`.

**Why**: Removes branching and conditional evaluation in the extremely hot frame loop, allowing V8 to optimize the single call path.
**Risk**: Function binding changes the execution shape dynamically. However, since the shape stabilizes after the first frame, V8 ICs will optimize the new shape efficiently.

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- tests/verify-cdp-driver.ts` to verify TimeDriver functionality.

## Correctness Check
Run the DOM render benchmark script (`npm run test -w packages/renderer`) to ensure successful execution.

## Prior Art
- PERF-461: Evaluated bypassing the stability check using a closure assignment, but wasn't fully integrated into a branchless model.

## Results Summary
- **Best render time**: 4.792s (vs baseline 4.768s)
- **Improvement**: 0% (slight regression)
- **Kept experiments**: []
- **Discarded experiments**: [Prebind stability check to remove branch in hot loop]
