---
id: PERF-1120
slug: remove-unused-domlastframebuffer
status: unclaimed
claimed_by: ""
created: 2023-10-21
completed: ""
result: ""
---
# PERF-1120: Simplify Final Frame Logic in CaptureLoop.ts Single-Worker Path

## Focus Area
The single-worker final frame path in `CaptureLoop.ts` (the `totalFrames > 1` block).

## Background Research
Currently, at the end of the single-worker path, there's a final frame capture step that handles `totalFrames > 1`.
Because of PERF-1116 and other experiments, we've started simplifying redundant variables. In the single-worker path, the final frame capture doesn't need to assign to `domLastFrameBuffer` because it's the *last* frame, and we don't read from `domLastFrameBuffer` anymore. It's just written to the stream.

We can eliminate `domLastFrameBuffer` assignment entirely here and use `const buf = Buffer.from(...)` directly, exactly like we did in the initial frame block.

## Benchmark Configuration
- **Composition URL**: file:///app/examples/dom-benchmark/composition.html
- **Render Settings**: 600x600, 30fps, 5s
- **Mode**: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 8.647s
- **Bottleneck analysis**: Minor AST bloat from unused variables inside the single-worker hot path structure.

## Implementation Spec

### Step 1: Remove unused domLastFrameBuffer from single-worker final frame and main loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove `let domLastFrameBuffer: Buffer | null = null;` at the top of the single-worker path.
2. In the initial frame block (`totalFrames > 0`), change `domLastFrameBuffer = Buffer.from(...)` to `const buf = Buffer.from(...)` and write `buf`.
3. In the chunk loop, change `domLastFrameBuffer = Buffer.from(...)` to `const buf = Buffer.from(...)`.
4. In the final frame block (`!aborted && totalFrames > 1`), change `domLastFrameBuffer = Buffer.from(...)` to `const buf = Buffer.from(...)` and write `buf`.
5. Remove `let domLastFrameBuffer: Buffer | null = null;` at the top of the multi-worker path.
6. In the `runWorker` loop, change `domLastFrameBuffer = buf;` to simply not assigning it.

**Why**: `domLastFrameBuffer` is never read from in `CaptureLoop.ts`. Removing this redundant variable simplifies the V8 AST and eliminates unnecessary closure mutation, marginally improving engine performance overhead.
**Risk**: Negligible. Variable is unused.

## Variations
N/A

## Canvas Smoke Test
Run `npx tsx scripts/benchmark-perf.ts` to verify the canvas path runs correctly.

## Correctness Check
Run the DOM benchmark `npx tsx scripts/benchmark-perf.ts --mode=dom` to confirm the video is generated correctly without errors.

## Prior Art
PERF-1116 inlined `buf` variable assignments. This takes it a step further by removing the outer closure tracking variable entirely.