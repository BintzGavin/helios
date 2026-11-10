---
id: PERF-1209
slug: inline-rawresult-single-worker-dom
status: unclaimed
claimed_by: ""
created: 2024-05-30
completed: ""
result: ""
---

# PERF-1209: Inline base64Str alias in single-worker DOM capture loop

## Focus Area
The single-worker DOM capture fast path in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, eliminating the redundant `base64Str` variable alias.

## Background Research
In the single-worker `isDomStrategy` loop, `rawResult` (which is already a `string`) is needlessly cast and aliased to a new variable `const base64Str = rawResult as string;`. This occurs in two places:
1. Before the main `while` loop (handling the first frame).
2. Inside the inner `for` loop (handling subsequent chunked frames).
3. After the main `while` loop (handling the last frame).

Removing this intermediate assignment and casting `rawResult` directly in place reduces V8 AST complexity, parser overhead, and temporary variable allocation within the hottest loops of the application. The executor successfully verified similar performance gains in PERF-1207 (multi-worker path) and PERF-1206 (single-worker canvas path).

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-dom-animation/composition.html`
- **Render Settings**: 1080p, 60fps, 10 seconds, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~6.29s (based on PERF-1207 results)
- **Bottleneck analysis**: Micro-optimizing inner loop execution by stripping intermediate variable scopes.

## Implementation Spec

### Step 1: Inline `base64Str` in the pre-loop frame write
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Remove `const base64Str = rawResult as string;`
Change:
```typescript
pendingBytes += (base64Str.length * 3) >>> 2;
if (!stream.write(base64Str, "base64") && pendingBytes >= MAX_PENDING_BYTES) {
```
To:
```typescript
pendingBytes += ((rawResult as string).length * 3) >>> 2;
if (!stream.write(rawResult as string, "base64") && pendingBytes >= MAX_PENDING_BYTES) {
```
**Why**: Avoids allocating an unnecessary local variable for the initial frame write.

### Step 2: Inline `base64Str` in the inner chunk `for` loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside `for (; i !== chunkEnd; i++)`, remove `const base64Str = rawResult as string;`
Change:
```typescript
pendingBytes += (base64Str.length * 3) >>> 2;
if (!stream.write(base64Str, "base64") && pendingBytes >= MAX_PENDING_BYTES) {
```
To:
```typescript
pendingBytes += ((rawResult as string).length * 3) >>> 2;
if (!stream.write(rawResult as string, "base64") && pendingBytes >= MAX_PENDING_BYTES) {
```
**Why**: Removes an intermediate variable assignment that happens synchronously on every single frame captured in DOM mode.

### Step 3: Inline `base64Str` in the post-loop frame write
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `if (!aborted && totalFrames > 1)` block, remove `const base64Str = rawResult as string;`
Change:
```typescript
pendingBytes += (base64Str.length * 3) >>> 2;
if (!stream.write(base64Str, "base64") && pendingBytes >= MAX_PENDING_BYTES) {
```
To:
```typescript
pendingBytes += ((rawResult as string).length * 3) >>> 2;
if (!stream.write(rawResult as string, "base64") && pendingBytes >= MAX_PENDING_BYTES) {
```
**Why**: Ensures consistent variable usage and avoids a final unnecessary local allocation.

## Correctness Check
Run `npx tsx tests/verify-cdp-determinism.ts` or general DOM rendering smoke tests to verify the base64 string is still properly encoded and written to the stream.
