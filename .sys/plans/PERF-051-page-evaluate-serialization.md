---
id: PERF-051
slug: page-evaluate-serialization
status: unclaimed
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---
# PERF-051: Eliminate Serialization for Frame Evaluate Fallback

## Focus Area
DOM Rendering Frame Capture Overhead. This targets the V8 object serialization overhead occurring over Playwright's IPC layer when the fallback `frame.evaluate()` is used in `SeekTimeDriver.ts`.

## Background Research
In `SeekTimeDriver.ts`, the frame capture loop uses `frame.evaluate()` as a fallback for non-main frames. Currently, it evaluates an expression that implicitly returns the result of `window.__helios_seek()`. Although `__helios_seek` returns `undefined`, Playwright's `evaluate()` mechanism still allocates and serializes the return object over IPC. By modifying the evaluation block so it returns nothing (using curly braces without a `return` statement), we can bypass this serialization cost entirely.

## Benchmark Configuration
- **Composition URL**: Any standard DOM animation example.
- **Render Settings**: Standard benchmark settings
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 32.251s
- **Bottleneck analysis**: IPC communication and V8 serialization overhead due to Playwright returning and serializing the result of `frame.evaluate()` per frame.

## Implementation Spec

### Step 1: Remove return value from frame.evaluate
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**: Change the evaluation callback in the `else` block of `setTime` to an explicit block that does not return a value.
**Why**: Avoids serializing the return object over Playwright's IPC. We only care about executing the seek function.
**Risk**: Minimal. We don't use the return value.

## Variations
None.

## Canvas Smoke Test
`npx tsx packages/renderer/scripts/render.ts`

## Correctness Check
`npx tsx packages/renderer/tests/verify-seek-driver-offsets.ts`
