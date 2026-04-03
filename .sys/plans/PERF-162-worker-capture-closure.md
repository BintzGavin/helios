---
id: PERF-162
slug: worker-capture-closure
status: unclaimed
claimed_by: ""
created: 2024-05-30
completed: ""
result: ""
---

# PERF-162: Optimize worker capture closure binding

## Focus Area
Frame Capture Loop in `Renderer.ts`. We want to avoid allocating intermediate inline closures `() => executeFrameCapture(worker, compositionTimeInSeconds, time)` on every frame iteration inside `worker.activePromise.then`.

## Background Research
In PERF-160, `.bind` was replaced with an inline closure inside `Renderer.ts` (`captureLoop`), reducing object creation. However, the current code still creates an inline closure on every frame.
We can eliminate this overhead by pre-calculating the closures for every frame before entering the hot `while` loop. By mapping over all frames and pre-binding the specific `worker`, `compositionTimeInSeconds`, and `time` variables to an array of functions, we move the memory allocation and GC pressure of closure creation out of the hot frame-capture loop.

## Benchmark Configuration
- **Composition URL**: /app/output/example-build/examples/simple-animation/composition.html
- **Render Settings**: 1280x720, 30fps, 5s (150 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Micro-allocations inside the hot while loop in `captureLoop`.

## Implementation Spec

### Step 1: Pre-calculate frame execution closures
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
1. Before the `while (nextFrameToWrite < totalFrames)` loop, pre-calculate an array of execution closures for every frame:
```typescript
const executeHandlers = new Array(totalFrames);
for (let i = 0; i < totalFrames; i++) {
    const worker = pool[i % poolLen];
    const time = i * timeStep;
    const compositionTimeInSeconds = (startFrame + i) * compTimeStep;
    executeHandlers[i] = () => executeFrameCapture(worker, compositionTimeInSeconds, time);
}
```
2. Inside the hot loop, replace the inline closure allocation with the pre-calculated one:
```typescript
const framePromise = worker.activePromise.then(executeHandlers[frameIndex]);
```
**Why**: Moves closure allocations out of the hot frame-capture evaluation loop, paying the setup cost upfront, avoiding micro-allocations.

### Step 2: Evaluate and Record Benchmark Result
**File**: Execution Script
**What to change**: Provide a deterministic script to measure the benchmark and update logs.
**Script**:
```bash
#!/bin/bash
# 1. Run npx tsx packages/renderer/tests/fixtures/benchmark.ts 3 times.
echo "Running baseline..."
BASELINE_TIMES=()
for i in {1..3}; do
  OUTPUT=$(npx tsx packages/renderer/tests/fixtures/benchmark.ts)
  TIME=$(echo "$OUTPUT" | awk '/render_time_s:/ {print $2}')
  echo "Baseline Run $i: $TIME"
  BASELINE_TIMES+=($TIME)
done
# Calculate baseline median
BASELINE_MEDIAN=$(printf "%s\n" "${BASELINE_TIMES[@]}" | sort -n | awk 'NR==2 {print $1}')
echo "Baseline Median: $BASELINE_MEDIAN"

echo "Applying implementation..."
# (Implementation applied via replace_with_git_merge_diff by Executor)

echo "Running experiment..."
EXP_TIMES=()
for i in {1..3}; do
  OUTPUT=$(npx tsx packages/renderer/tests/fixtures/benchmark.ts)
  TIME=$(echo "$OUTPUT" | awk '/render_time_s:/ {print $2}')
  echo "Experiment Run $i: $TIME"
  EXP_TIMES+=($TIME)
done
# Calculate experiment median
EXP_MEDIAN=$(printf "%s\n" "${EXP_TIMES[@]}" | sort -n | awk 'NR==2 {print $1}')
echo "Experiment Median: $EXP_MEDIAN"

# Evaluate outcome
DIFF=$(awk -v b="$BASELINE_MEDIAN" -v e="$EXP_MEDIAN" 'BEGIN {print e - b}')
STATUS="failed"
NOTES="Median changed from $BASELINE_MEDIAN to $EXP_MEDIAN"
if awk -v diff="$DIFF" 'BEGIN {if (diff < -0.1) exit 0; else exit 1}'; then
  STATUS="improved"
  echo "Experiment IMPROVED."
else
  STATUS="failed"
  echo "Experiment FAILED."
  git restore packages/renderer/src/Renderer.ts
fi

# Record to perf-results.tsv
# Columns: run_id, render_time_s, frames, fps, peak_mem_mb, status, notes
echo -e "PERF-162\t$EXP_MEDIAN\t150\t30\t0\t$STATUS\t$NOTES" >> packages/renderer/.sys/perf-results.tsv

# Record to RENDERER-EXPERIMENTS.md
if [ "$STATUS" = "improved" ]; then
  awk '/## What Works/ && !inserted { print $0 "\n- [PERF-162] Pre-calculated execution closures in Renderer.ts captureLoop outside hot loop. ('"$NOTES"')"; inserted=1; next } { print }' docs/status/RENDERER-EXPERIMENTS.md > temp.md && mv temp.md docs/status/RENDERER-EXPERIMENTS.md
else
  awk '/## What Doesn'\''t Work/ && !inserted { print $0 "\n- **Pre-calculate execution closures (PERF-162)**:\n  - What you tried: Pre-calculating closures outside hot loop in Renderer.ts.\n  - WHY it didn'\''t work: Render time degraded or unchanged ('"$NOTES"'). The inline closure overhead is negligible.\n  - Plan ID: PERF-162"; inserted=1; next } { print }' docs/status/RENDERER-EXPERIMENTS.md > temp.md && mv temp.md docs/status/RENDERER-EXPERIMENTS.md
fi
```

## Variations
### Variation A: Inline the logic entirely
Instead of `executeFrameCapture`, inline `worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).catch(noopCatch); return worker.strategy.capture(worker.page, time);` directly inside the pre-calculated array.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure the canvas pipeline functions.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to verify DOM output is correct.

## Prior Art
- PERF-160 (Replaced bind with inline closure)
- PERF-159 (Removed closure allocation)
- PERF-134 (Failed unchained execution)
