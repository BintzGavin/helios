---
id: PERF-675
slug: optimize-jpeg-quality
status: complete
claimed_by: "executor-session"
created: 2026-06-04
completed: 2026-06-04
result: no-improvement
---

# PERF-675: Optimize JPEG Quality

## Focus Area
Optimize intermediate format JPEG quality inside `DomStrategy.ts`. The current benchmark uses JPEG for the screencast intermediate. Testing lower qualities that maintain acceptable visual output can decrease Base64 payload size and reduce IPC/JSON parsing overhead in the Node process.

## Background Research
Slightly lowering the quality (e.g., from 90 to 80 or 85) might hit a sweet spot: significantly reducing payload size while avoiding visual artifacting and potentially minimizing V8 IPC string processing overhead, which remains a key bottleneck in the hot capture loop.

## Benchmark Configuration
- **Composition URL**: file:///app/examples/dom-benchmark/composition.html
- **Render Settings**: 600x600
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds

## Baseline
- **Current estimated render time**: ~2.447s
- **Bottleneck analysis**: IPC payload transfer and Base64 string decoding in Node.js hot loop.

## Implementation Spec

### Step 1: Update JPEG Quality
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**: Adjust `quality = quality ?? 90;` to `quality = quality ?? 80;` around line 113.
**Why**: Reduces the payload byte size transmitted over CDP from Chromium to Node, decreasing IPC latency and JSON parse time in V8, while retaining reasonable image fidelity.
**Risk**: Visual artifacts if quality is reduced too far, or if Chromium Skia CPU compression time increases more than the IPC savings.

## Correctness Check
Run the visual benchmark `npx tsx scripts/benchmark-perf.ts --mode=dom` and observe the output `.mp4` file to ensure acceptable visual quality without gross compression artifacts.

## Results Summary
- **Best render time**: 2.465s (vs baseline ~2.534s median)
- **Improvement**: 0% (inconclusive / no statistically significant improvement)
- **Kept experiments**: []
- **Discarded experiments**: [quality 80]
