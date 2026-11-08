---
id: PERF-1191
slug: eliminate-double-array-lookup
status: complete
claimed_by: ""
created: 2024-11-08
completed: ""
result: ""
---

# PERF-1191: Eliminate double array lookup in multi-worker chunk writer

## Focus Area
The multi-worker chunk writer loop in `CaptureLoop.ts`.

## Background Research
In `CaptureLoop.ts`, during the multi-worker chunk writer loop (for both `isDomStrategy` true and false), there are three consecutive array lookups for `frameBufferRing[ringIndex]`:
1. `if (frameBufferRing[ringIndex] === null)`
2. `const buffer = frameBufferRing[ringIndex] as string;` (or `as Buffer;`)
3. `frameBufferRing[ringIndex] = null;`

Array element access in JavaScript, although fast, still carries a small overhead compared to local variable access. Extracting `frameBufferRing[ringIndex]` into a local variable before the `null` check avoids two redundant array property lookups inside this extremely hot loop, which executes for every frame in multi-worker mode.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: Resolution 600x600, 30 FPS, duration 5s (150 frames), h264 ultrafast codec
- **Mode**: `dom` (using `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=dom`)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 8.658s
- **Bottleneck analysis**: Micro-optimizing hot loops directly impacts the maximum throughput the V8 JS engine can achieve during frame assignment and stream writing.

## Implementation Spec

### Step 1: Optimize array lookup in `isDomStrategy` branch
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker writer loop, replace:
```typescript
                const ringIndex = nextFrameToWrite & ringMask;
                if (frameBufferRing[ringIndex] === null) {
                  break;
                }

                const buffer = frameBufferRing[ringIndex] as string;
                frameBufferRing[ringIndex] = null;
```
with:
```typescript
                const ringIndex = nextFrameToWrite & ringMask;
                const buffer = frameBufferRing[ringIndex] as string | null;
                if (buffer === null) {
                  break;
                }

                frameBufferRing[ringIndex] = null;
```
**Why**: Reduces V8 array bounds checking and property lookup overhead in the hot path.
**Risk**: Very low, functionally identical.

### Step 2: Optimize array lookup in non-DOM branch
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker writer loop (`} else {` branch), replace:
```typescript
                const ringIndex = nextFrameToWrite & ringMask;
                if (frameBufferRing[ringIndex] === null) {
                  break;
                }

                const buffer = frameBufferRing[ringIndex] as Buffer;
                frameBufferRing[ringIndex] = null;
```
with:
```typescript
                const ringIndex = nextFrameToWrite & ringMask;
                const buffer = frameBufferRing[ringIndex] as Buffer | null;
                if (buffer === null) {
                  break;
                }

                frameBufferRing[ringIndex] = null;
```
**Why**: Same as Step 1.
**Risk**: Very low.

## Correctness Check
Run standard tests to verify the DOM path remains functional without frame drops or memory leaks.

## Canvas Smoke Test
Run canvas benchmark to verify it doesn't break canvas rendering.
```tsv
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	18.432	150	8.14	61.5	keep	baseline
2	6.732	150	22.28	61.5	keep	eliminated double array lookup in multi-worker chunk writer
```
