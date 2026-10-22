---
id: PERF-1123
slug: hoist-max-pending-bytes
status: unclaimed
claimed_by: ""
created: 2026-10-22
completed: ""
result: ""
---

# PERF-1123: Hoist MAX_PENDING_BYTES constant in CaptureLoop.ts

## Focus Area
`CaptureLoop.ts` (`packages/renderer/src/core/CaptureLoop.ts`).

## Background Research
Inside the core `CaptureLoop.ts` logic for both single and multi-worker paths, there is a drain check:
`if (!stream.write(buf) && pendingBytes >= 16777216)`
The numeric literal `16777216` (16MB) is evaluated on every iteration of the hot frame-capture loop. V8 generally handles small integers well, but a large numeric literal inside a tight loop requires parser evaluation and potential heap allocation if not fully optimized by TurboFan. Hoisting this literal to a top-level constant `MAX_PENDING_BYTES` outside the loops ensures it is parsed exactly once, reducing AST complexity and potential evaluation overhead inside the hot loop.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Micro-optimizations of literals inside hot loops can occasionally yield small improvements in parsing and branch evaluation times within the V8 engine.

## Implementation Spec

### Step 1: Hoist constant outside the loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
At the top of the function or file, declare the constant:
```typescript
const MAX_PENDING_BYTES = 16777216;
```

### Step 2: Replace numeric literal in single-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker `stream.write` blocks, replace occurrences of:
```typescript
if (!stream.write(buf) && pendingBytes >= 16777216) {
```
with:
```typescript
if (!stream.write(buf) && pendingBytes >= MAX_PENDING_BYTES) {
```

### Step 3: Replace numeric literal in multi-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker `stream.write` blocks (around line 550+ where writer chunk logic exists), replace occurrences of:
```typescript
if (!stream.write(finalBuffer) && pendingBytes >= 16777216) {
```
with:
```typescript
if (!stream.write(finalBuffer) && pendingBytes >= MAX_PENDING_BYTES) {
```

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to ensure canvas path writing is unaffected.

## Correctness Check
Run `npx tsx scripts/benchmark-perf.ts --mode=dom` inside `packages/renderer`.
