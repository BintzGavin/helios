---
id: PERF-1172
slug: optimize-targeth-calculation
status: complete
claimed_by: "jules"
created: 2024-11-04
completed: "2024-11-04"
result: "kept"
---

# PERF-1172: Optimize targetH calculation in worker dispatch loop

## Focus Area
The multi-worker dispatch calculation block inside `CaptureLoop.ts` when deciding how many tasks to assign to waiting workers.

## Background Research
During the multi-worker execution dispatch phase, `CaptureLoop.ts` calculates a `targetH` variable which sets the stopping boundary for taking workers from the `freeWorkers` stack.

Currently it is written as:
`const targetH = h - (dispatches < h ? dispatches : h);`

This forces a subtraction operation `h - h` which equals `0` every time `dispatches >= h`. We can optimize this by evaluating to `0` directly. By writing `const targetH = dispatches < h ? h - dispatches : 0;` we can avoid a redundant arithmetic operation and reduce V8 AST size slightly.

## Benchmark Configuration
- **Composition URL**: Any multi-worker capable URL
- **Render Settings**: 1080p, 60fps, 3s
- **Mode**: `dom` or `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The worker assignment loop runs heavily in multi-worker scenarios. Every CPU cycle counts in the tight loop.

## Implementation Spec

### Step 1: Optimize targetH math expression
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `CaptureLoop.ts` around line 428, change:
```typescript
const targetH = h - (dispatches < h ? dispatches : h);
```
to:
```typescript
const targetH = dispatches < h ? h - dispatches : 0;
```
**Why**: Avoids doing unnecessary subtraction when `dispatches >= h`.
**Risk**: None, mathematically identical.

## Variations
None.

## Canvas Smoke Test
Run `npm run test --workspace=packages/renderer`

## Correctness Check
Run `npm run test --workspace=packages/renderer`

## Results Summary
```
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	8.709	150	17.22	63.7	keep	optimize targetH calculation in worker dispatch loop
2	8.730	150	17.18	64.5	keep	optimize targetH calculation in worker dispatch loop
3	8.722	150	17.20	63.5	keep	optimize targetH calculation in worker dispatch loop
```
