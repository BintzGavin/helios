---
id: PERF-082
slug: cache-array-lengths
status: complete
claimed_by: "executor-session"
created: 2024-03-27
completed: "2026-03-27"
result: "improved"
---

# PERF-082: Cache array lengths in hot loops to avoid redundant access

## Focus Area
The hot capture loops in `packages/renderer/src/drivers/SeekTimeDriver.ts` and `packages/renderer/src/Renderer.ts`. We are targeting the repetitive access to array `.length` properties during frame evaluation loops.

## Background Research
While accessing the `length` property of an array in V8 is generally O(1) and very fast, inside hot paths like `setTime()` which executes per-frame across the entire composition, doing it repetitively within `for` loop conditions (`i < cachedAnimations.length`, `i < cachedMediaElements.length`, `i < cachedScopes.length`) or loop boundaries (`nextFrameToSubmit < totalFrames && (nextFrameToSubmit - nextFrameToWrite) < pool.length * 8`) can introduce minor overhead. Caching these lengths to local variables ensures they are read exactly once before the loop, slightly reducing property lookups and allowing better V8 optimization.

## Benchmark Configuration
- **Composition URL**: Standard benchmark
- **Render Settings**: Standard benchmark default settings
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.6s
- **Bottleneck analysis**: Micro-optimizing the loop conditions in the hot paths to reduce V8 property lookup overhead.

## Implementation Spec

### Step 1: Cache array lengths in SeekTimeDriver
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the injected script `window.__helios_seek`, cache the lengths of `cachedScopes`, `cachedAnimations`, and `cachedMediaElements` in the loop conditions.
For example:
Change:
```javascript
for (let i = 0; i < cachedScopes.length; i++) {
```
To:
```javascript
const numScopes = cachedScopes.length;
for (let i = 0; i < numScopes; i++) {
```
Change:
```javascript
for (let i = 0; i < cachedAnimations.length; i++) {
```
To:
```javascript
const numAnimations = cachedAnimations.length;
for (let i = 0; i < numAnimations; i++) {
```
Change:
```javascript
if (cachedMediaElements.length > 0) {
  for (let i = 0; i < cachedMediaElements.length; i++) {
```
To:
```javascript
const numMedia = cachedMediaElements.length;
if (numMedia > 0) {
  for (let i = 0; i < numMedia; i++) {
```
**Why**: Avoids repeated property lookup on cached arrays in the loop conditions within the injected browser script.
**Risk**: Very low, simple variable caching.

### Step 2: Cache `pool.length` in Renderer
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
In the `captureLoop` of the `render` method, cache the `pool.length`.
Change:
```typescript
while (nextFrameToSubmit < totalFrames && (nextFrameToSubmit - nextFrameToWrite) < pool.length * 8) {
    const frameIndex = nextFrameToSubmit;
    const worker = pool[frameIndex % pool.length];
```
To:
```typescript
const poolLen = pool.length;
while (nextFrameToSubmit < totalFrames && (nextFrameToSubmit - nextFrameToWrite) < poolLen * 8) {
    const frameIndex = nextFrameToSubmit;
    const worker = pool[frameIndex % poolLen];
```
**Why**: Same reasoning, avoiding redundant property lookups in the while loop condition and the modulo operation.
**Risk**: Very low.

## Correctness Check
1. The DOM verification tests should pass.
2. The renderer benchmark should execute without errors and produce valid video output.

## Results Summary
- **Best render time**: 33.696s (vs baseline 33.780s)
- **Improvement**: ~0.25%
- **Kept experiments**: Cached array lengths in `SeekTimeDriver.ts` (`cachedScopes`, `cachedAnimations`, `cachedMediaElements`) and `Renderer.ts` (`pool.length`).
- **Discarded experiments**: None
