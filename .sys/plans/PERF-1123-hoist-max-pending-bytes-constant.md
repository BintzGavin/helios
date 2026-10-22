---
id: PERF-1123
slug: hoist-max-pending-bytes-constant
status: unclaimed
claimed_by: ""
created: 2024-10-22
completed: ""
result: ""
---
# PERF-1123: Hoist `MAX_PENDING_BYTES` constant in `CaptureLoop.ts`

## Focus Area
DOM rendering loop (`CaptureLoop.ts`). Target: V8 literal parsing and AST complexity in the hot loop bounds checks.

## Background Research
The `CaptureLoop.ts` file contains the constant literal `16777216` (16MB) in 7 different places inside tight single-worker and multi-worker loops used for checking stream backpressure limits (`pendingBytes >= 16777216`).
Every time a large numeric literal is parsed inside a hot loop, the V8 TurboFan compiler must track its AST node and ensure type consistency. While often optimized by JIT, replacing the repeated magic number literal with a single module-level constant (`const MAX_PENDING_BYTES = 16777216`) outside the loop allows the compiler to resolve it as a fixed immutable memory reference early during compilation, simplifying the AST size and removing redundant literal nodes from the bytecode.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition.
- **Render Settings**: 1080p, 60fps, fixed duration.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.647s
- **Bottleneck analysis**: The hot loop is CPU-bound in V8. Minor AST reductions stack up for better JIT predictability.

## Implementation Spec

### Step 1: Define the Constant
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: At the top of the file (or outside the `CaptureLoop` class), add:
`const MAX_PENDING_BYTES = 16777216;`
**Why**: Creates a single immutable reference for V8 to cache.
**Risk**: None, functionally identical.

### Step 2: Replace literals
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Replace all 7 instances of `16777216` with `MAX_PENDING_BYTES` within the stream write checks.
`if (!stream.write(buffer) && pendingBytes >= MAX_PENDING_BYTES)`
**Why**: Decreases AST duplicate literal nodes in the tightest rendering loop bounds.
**Risk**: None.

## Canvas Smoke Test
Run canvas benchmark to ensure stream backpressure works as normal.

## Correctness Check
Verify output video plays correctly (no dropped frames).

## Prior Art
Prior optimizations like hoisting arrays and `Math.min()` constants have successfully reduced V8 branch/bytecode evaluation complexity in this same file.
