---
id: PERF-861
slug: chunked-loops-detailed
status: unclaimed
claimed_by: ""
created: 2026-06-27
completed: ""
result: ""
---

# PERF-861: Detailed Single-Worker Chunked Loops

## Focus Area
`CaptureLoop.ts` single-worker paths.

## Background Research
Supersedes PERF-860 to provide a more rigorous implementation spec for the fast path loops.

## Benchmark Configuration
- **Mode**: `dom`

## Baseline
- **Bottleneck analysis**: V8 branch evaluation overhead in tight loops.

## Implementation Spec

### Step 1: Replace all 8 single-worker loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Replace the `for (let i = 1; i < totalFrames; i++)` loops with chunked `while` loops.
**Why**: Eliminates per-iteration branch evaluation overhead.
**Risk**: Off-by-one errors.
