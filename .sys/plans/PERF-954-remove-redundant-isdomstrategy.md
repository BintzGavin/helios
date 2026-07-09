---
id: PERF-954
slug: remove-redundant-isdomstrategy
status: unclaimed
claimed_by: ""
created: 2024-07-09
completed: ""
result: ""
---

# PERF-954: Remove Redundant `isDomStrategy` Checks in Single-Worker Loop

## Focus Area
The single-worker fast path inside `CaptureLoop.ts`. Specifically, removing redundant `if (isDomStrategy)` checks that are nested inside outer `if (isDomStrategy)` blocks.

## Background Research
While exploring the single-worker capture loop, we identified multiple instances of nested `if (isDomStrategy)` blocks. For example, at line 259:
```typescript
            if (isDomStrategy) {
              if (isDomStrategy) {
```
And at line 529:
```typescript
            if (isDomStrategy) {
              if (isDomStrategy) {
```
Since the code is already inside an `if (isDomStrategy)` block, the inner check is logically guaranteed to be true. Removing this redundant dynamic branch evaluation reduces V8 parser overhead, shrinks the JIT burden, and keeps the AST smaller, yielding a positive performance impact with zero risk.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: `dom` (single-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The V8 engine has to repeatedly evaluate dynamic conditions in hot loops. Although branch prediction is good, removing guaranteed true statements eliminates the evaluation entirely.

## Implementation Spec

### Step 1: Remove Redundant Nested Check in First Block
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the first nested `if (isDomStrategy)` check around line 259:
```typescript
            if (isDomStrategy) {
              if (isDomStrategy) {

                let i = 1;
```
Remove the inner `if (isDomStrategy)` wrapper, keeping its contents directly under the outer `if (isDomStrategy)`. Ensure the `else` block (around line 330) corresponding to the outer `if (isDomStrategy)` remains structurally correct, and remove the `else` block corresponding to the inner `if` if one exists (it shouldn't).

### Step 2: Remove Redundant Nested Check in Second Block
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the second nested `if (isDomStrategy)` check around line 529:
```typescript
            if (isDomStrategy) {
              if (isDomStrategy) {

                let i = 1;
```
Remove the inner `if (isDomStrategy)` wrapper, keeping its contents directly under the outer `if (isDomStrategy)`. Ensure the `else` block corresponding to the outer `if (isDomStrategy)` remains structurally correct.

**Why**: Removing dead code decreases parser overhead and execution time inside the hot loop.

## Variations
None.

## Canvas Smoke Test
Ensure Canvas renders successfully to verify non-DOM strategies are unaffected.

## Correctness Check
Run tests to confirm stream output writes perfectly.
