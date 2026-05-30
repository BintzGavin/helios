---
id: PERF-627
slug: consolidate-capture-branching
status: unclaimed
claimed_by: ""
created: 2027-06-06
completed: ""
result: ""
---

# PERF-627: Consolidate Capture Branching in DomStrategy

## Focus Area
`DomStrategy.ts` hot loop `capture()` method and `CaptureLoop.ts` error handling.

## Background Research
The `capture()` method in `DomStrategy.ts` currently evaluates conditional logic related to `targetElementHandle` on every single frame to determine which parameter object to pass to `HeadlessExperimental.beginFrame`. This creates unnecessary branching logic in the absolute hottest path and doubles the bytecode size of the function. By determining the active parameter object once during the `prepare()` phase and storing it in a unified pre-computed variable reference, we can eliminate the branch entirely. This reduces V8 bytecode size, increasing the likelihood of aggressive inlining into the `CaptureLoop` hot path. Additionally, we need to apply a known memory fix to `CaptureLoop.ts` to ensure fatal rendering errors are thrown immediately inside the writer loop rather than silently terminating.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/output/example-build/composition.html`
- **Render Settings**: 1080p, 60fps, 150 frames, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.317s
- **Bottleneck analysis**: The `capture` loop is the hottest path in the codebase. Any reduction in bytecode size and branching here improves V8 inline cache efficiency.

## Implementation Spec

### Step 1: Consolidate BeginFrame Params
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Add a new private property `private activeBeginFrameParams: any = null;`.
2. In the `prepare()` method, assign the correct params:
   - If the target selector is active and dimensions are extracted, set `this.activeBeginFrameParams` to the target params.
   - Else, set `this.activeBeginFrameParams` to the default params.
3. Rewrite the `capture()` method to completely remove the conditional branch evaluating `targetElementHandle`. The new method should be a single `try/catch` block that awaits the CDP `beginFrame` command using `this.activeBeginFrameParams` and returns the last frame data.
**Why**: Eliminates a branch on every frame and reduces function bytecode size to maximize V8 inlining.
**Risk**: Low. The logic is functionally identical.

### Step 2: Fix CaptureLoop Error Handling
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. In the `run()` method's writer loop, change the `while` loop condition from `while (nextFrameToWrite < this.totalFrames && !aborted)` to `while (nextFrameToWrite < this.totalFrames)`.
2. Inside the loop, immediately after `checkState()`, add `if (fatalError) throw fatalError;` BEFORE `if (aborted) break;`.
**Why**: Fulfills the memory constraint: "ensure `if (fatalError) throw fatalError;` is evaluated before `if (aborted) break;` so that rendering errors are thrown instead of silently terminating the loop."
**Risk**: Low. Ensures errors propagate correctly.

### Step 3: Optimize CdpTimeDriver string allocation
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Pre-assign the expression string in `singleFrameSyncMediaParams` initialization: `private singleFrameSyncMediaParams: any = { expression: "window.__helios_sync_media();", awaitPromise: false, returnByValue: false };`
2. Remove the redundant `expression = "window.__helios_sync_media();"` assignment inside the `defaultSyncMedia()` method.
**Why**: Avoids reassigning the exact same string property on every frame loop iteration.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx tests/run-all.ts` and ensure canvas outputs still render properly without crashing.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-determinism.ts` to ensure frame output remains deterministic.
