---
id: PERF-765
slug: optimize-captureloop-write
status: complete
claimed_by: "jules"
created: 2024-06-14
completed: ""
result: "discarded"
---

# PERF-765: Avoid Re-Checking canWriteMore in CaptureLoop

## Focus Area
`CaptureLoop.ts` FFmpeg stdin write operations.

## Background Research
Currently, `CaptureLoop.ts` does:
```typescript
                    const canWriteMore = stdin.write(buffer as any);

                    if (!canWriteMore && stdin.writableLength >= 16777216) {
                        await this.drainPromise;
                    }
```
Node.js `Writable.write` returns `false` if the internal buffer is full. V8 spends time allocating variables and checking conditions like `canWriteMore` and `stdin.writableLength`. However, we can use short-circuit logic `if (!stdin.write(buffer as any) && stdin.writableLength >= 16777216)` to skip the variable allocation and improve branch prediction in the fast path and multi-worker loops.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark
- **Render Settings**: 600x600, 30fps, 5s (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Micro-optimizing the inner loop can reduce bytecode execution.

## Implementation Spec

### Step 1: Inline stdin.write logic
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In both single-worker and multi-worker loops, change the block:
```typescript
                    const canWriteMore = stdin.write(buffer as any);

                    if (!canWriteMore && stdin.writableLength >= 16777216) {
                        await this.drainPromise;
                    }
```
to:
```typescript
                    if (!stdin.write(buffer as any) && stdin.writableLength >= 16777216) {
                        await this.drainPromise;
                    }
```
Also change the finalBuffer write at the end of the file:
```typescript
          const canWriteMore = stdin.write(finalBuffer as any);
          if (!canWriteMore) {
              await this.drainPromise;
          }
```
to:
```typescript
          if (!stdin.write(finalBuffer as any)) {
              await this.drainPromise;
          }
```
**Why**: Avoid local variable assignment and let V8 evaluate the stream state inline.
**Risk**: Negligible, functionally identical.

## Variations
None.

## Canvas Smoke Test
Run `npm run build -w packages/renderer`.

## Correctness Check
Run the DOM render benchmark script (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts`) to ensure it produces valid outputs without regressions.

## Prior Art
- PERF-689 (Native Stream Buffering Single Worker)
- PERF-752 (Unify FFmpeg stdin write)

## Results Summary

```tsv
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	2.168	150	69.18	62.8	discard	optimize-captureloop-write
2	2.231	150	67.23	62.9	discard	optimize-captureloop-write
3	2.222	150	67.51	62.9	discard	optimize-captureloop-write
```
