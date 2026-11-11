---
id: PERF-1217
slug: inline-dom-pendingbytes-single-worker
status: claimed
claimed_by: "executor-session"
created: 2025-02-28
completed: "2026-11-11"
result: "discarded"
---

# PERF-1217: Inline DOM pending bytes calculation in single-worker loops

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - the `pendingBytes` base64 string length calculation inside the single-worker `!hasProcessFn` path and single-worker initialization code for `isDomStrategy = true`.

## Background Research
Currently in `CaptureLoop.ts`, in the DOM single-worker fast loops, when a base64 string is retrieved:
```typescript
const base64Str = rawResult as string;
pendingBytes += (base64Str.length * 3) >>> 2;
```
This requires an intermediate variable `base64Str`. We can inline this directly in `pendingBytes += ((rawResult as string).length * 3) >>> 2;` to reduce AST footprint and V8 parsing instructions in the hot loop. This simplifies the loop execution profile in the fast path where object type isn't dynamically evaluated because it's inside `isDomStrategy`.

## Benchmark Configuration
- **Composition URL**: Any standard DOM test
- **Mode**: `dom`
- **Metric**: Execution speed / AST simplicity

## Baseline
- **Current estimated render time**: ~6.291s
- **Bottleneck analysis**: Small intermediate string variables inside the fast loop path slow down execution context slightly.

## Implementation Spec

### Step 1: Inline base64Str calculation in single worker loop initialization block
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `if (isDomStrategy)` block of the single worker `!hasProcessFn` path:
Replace:
```typescript
const base64Str = rawResult as string;
pendingBytes += (base64Str.length * 3) >>> 2;
if (!stream.write(base64Str, "base64") && pendingBytes >= MAX_PENDING_BYTES) {
```
with:
```typescript
pendingBytes += ((rawResult as string).length * 3) >>> 2;
if (!stream.write(rawResult as string, "base64") && pendingBytes >= MAX_PENDING_BYTES) {
```
**Why**: Avoids creating a local string reference for the raw result buffer, optimizing the V8 compilation for the parser.
**Risk**: Minimal, functionality is identical.

### Step 2: Inline base64Str calculation in single worker chunk loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `for (; i !== chunkEnd; i++)` chunk loop under `if (isDomStrategy)`:
Replace:
```typescript
const base64Str = rawResult as string;
pendingBytes += (base64Str.length * 3) >>> 2;
if (!stream.write(base64Str, "base64") && pendingBytes >= MAX_PENDING_BYTES) {
```
with:
```typescript
pendingBytes += ((rawResult as string).length * 3) >>> 2;
if (!stream.write(rawResult as string, "base64") && pendingBytes >= MAX_PENDING_BYTES) {
```
**Why**: Removes intermediate variable from the tightest frame evaluation loop.

### Step 3: Inline base64Str calculation in single worker final frame block
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the final frame generation block under `if (isDomStrategy)`:
Replace:
```typescript
const base64Str = rawResult as string;
pendingBytes += (base64Str.length * 3) >>> 2;
if (!stream.write(base64Str, "base64") && pendingBytes >= MAX_PENDING_BYTES) {
```
with:
```typescript
pendingBytes += ((rawResult as string).length * 3) >>> 2;
if (!stream.write(rawResult as string, "base64") && pendingBytes >= MAX_PENDING_BYTES) {
```
**Why**: Maintains consistency across all evaluation blocks.

## Canvas Smoke Test
Run canvas benchmark to verify no unintended breakage.

## Correctness Check
Verify dom benchmarks write out a playable file.

## Prior Art
- PERF-1209 where we did the same for `rawResult` in `!hasProcessFn`.
