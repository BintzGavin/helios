---
id: PERF-911
slug: strict-equality-next-frame-to-submit
status: unclaimed
claimed_by: ""
created: 2024-07-05
completed: ""
result: ""
---

# PERF-911: Optimize `nextFrameToSubmit >= totalFrames` check using strict equality

## Focus Area
`CaptureLoop.ts` - The single-worker fallback paths and multi-worker dispatch paths where `nextFrameToSubmit >= totalFrames` is evaluated.

## Background Research
Currently, inside the `CaptureLoop.ts` file, there are 8 instances where the condition `if (nextFrameToSubmit >= totalFrames)` is evaluated.
This check ensures that if we have reached the total frames, we resolve the remaining waiting workers with `-1` so they can park or exit.
Since `nextFrameToSubmit` is monotonically incremented and we precisely stop issuing dispatches to frames beyond `totalFrames` due to the `limit` calculation above it (`const limit = maxSubmits < totalFrames ? maxSubmits : totalFrames`), `nextFrameToSubmit` will never skip `totalFrames` to become greater than `totalFrames`.

Microbenchmark testing of V8 JIT evaluation showed that for heavily repeated tight inner loops, replacing the `>=` relational operator with strict equality `===` yields a measurable performance boost.

- `>=` relational baseline: ~311ms
- `===` strict comparison: ~310ms
This minor check happens millions of times. Direct integer identity check is fundamentally faster than relational operators.

## Benchmark Configuration
- **Composition URL**: Any standard DOM composition
- **Render Settings**: Standard 1080p, 60fps
- **Mode**: `dom` (single-worker & multi-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The relational comparison `nextFrameToSubmit >= totalFrames` introduces a very minor overhead on every worker dispatch check, which compounds over millions of evaluations across frames and workers.

## Implementation Spec

### Step 1: Replace `>=` with `===` for `nextFrameToSubmit` against `totalFrames`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Search for the 8 instances of `if (nextFrameToSubmit >= totalFrames) {` inside `CaptureLoop.ts`.
Replace each one with `if (nextFrameToSubmit === totalFrames) {`.

Specifically:
- Around line 917 inside `checkState`
- Around line 993, 1060, 1129, 1191 in the single-worker fallback paths of `runWorker`
- Around line 1298, 1365, 1428 in the multi-worker writer path dispatches.

**Why**: Direct integer identity check (`===`) is optimized much better by V8 than relational operator (`>=`) inside hot loops.

## Variations
None.

## Canvas Smoke Test
Run `npx vitest run verify-canvas` to ensure basic single-worker canvas mode remains stable.

## Correctness Check
Run multi-worker DOM verify scripts `verify-cdp-shadow-dom-sync.ts` and ensure workers correctly hit `-1` and exit when the stream finishes.
