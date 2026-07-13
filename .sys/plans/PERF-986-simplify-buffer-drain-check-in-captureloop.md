---
id: PERF-986
slug: simplify-buffer-drain-check-in-captureloop
status: unclaimed
claimed_by: ""
created: 2024-07-13
completed: ""
result: ""
---

# PERF-986: Simplify buffer drain check in CaptureLoop fast paths

## Focus Area
The `stream.write()` outcome evaluation and `drainPromise` await in `packages/renderer/src/core/CaptureLoop.ts` fast loops.

## Background Research
Throughout `CaptureLoop.ts` in both single-worker and multi-worker modes, there is a recurring pattern to check stream backpressure:
```typescript
if (writeSuccessStr) {} else if (pendingBytes >= 16777216) {
  await this.drainPromise;
  pendingBytes = 0;
}
```
This empty `if` block forces V8 to parse and compile an empty statement branch for the absolute most common path (success), jumping past the `else if`. We can simplify this logic to evaluate the inverse condition using boolean NOT `!`, removing the empty block and reducing branch instruction count:
```typescript
if (!writeSuccessStr && pendingBytes >= 16777216) {
  await this.drainPromise;
  pendingBytes = 0;
}
```
V8's Short-Circuit evaluation `!writeSuccessStr` means the `pendingBytes` check is bypassed entirely on the fast path (where `writeSuccessStr` is `true`). This is mathematically equivalent but structurally more efficient for the JIT compiler, leading to a smaller AST footprint in the hot loops.

## Benchmark Configuration
- **Composition URL**: Standard DOM and Canvas benchmarks
- **Render Settings**: Standard
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The V8 parser evaluates an empty code block on the hot path in every frame rendering loop for both strategies and worker modes.

## Implementation Spec

### Step 1: Replace empty if blocks with short-circuit evaluation
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Search for all instances of:
```typescript
if (writeSuccess) {} else if (pendingBytes >= 16777216) {
```
and
```typescript
if (writeSuccessStr) {} else if (pendingBytes >= 16777216) {
```
and
```typescript
if (writeSuccessBuf) {} else if (pendingBytes >= 16777216) {
```
Replace them with the mathematically equivalent:
```typescript
if (!writeSuccess && pendingBytes >= 16777216) {
```
(Using the correct variable name `writeSuccess`, `writeSuccessStr`, or `writeSuccessBuf` respectively).

**Why**: Removes a dead empty block from the AST, relying on JavaScript's standard short-circuit evaluation to skip the byte limit check when the stream write succeeds.

## Correctness Check
Run `npm test -w packages/renderer` to ensure nothing is broken and that stream backpressure still correctly waits for `drainPromise`.
