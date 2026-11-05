---
id: PERF-1175
slug: unroll-buffer-type-dispatch-in-multi-worker-chunk-writer
status: complete
claimed_by: "jules"
created: 2024-11-06
completed: 2024-11-06
result: "keep"
---

# PERF-1175: Unroll buffer type dispatch in multi-worker writer chunk loops

## Focus Area
The multi-worker frame rendering writer chunk loop in `packages/renderer/src/core/CaptureLoop.ts` (around line 560).

## Background Research
Currently, the main frame-processing loop for multi-worker captures uses a type check `if (typeof buffer === "string")` inside the inner loop:
```typescript
while (nextFrameToWrite !== chunkEnd) {
  // ...
  if (typeof buffer === "string") {
    // string base64 path
  } else {
    // buffer path
  }
}
```
Checking `typeof` inside a tight inner loop causes per-iteration branching overhead.
Since `isDomStrategy` already uniquely determines whether we output strings (base64) or Node.js Buffers, we can unroll the `typeof buffer === "string"` check completely by branching on `isDomStrategy` *before* the inner `while (nextFrameToWrite !== chunkEnd)` loop!

## Baseline
- **Bottleneck analysis**: Unnecessary per-frame branch evaluation `typeof buffer === "string"` inside the `while (nextFrameToWrite !== chunkEnd)` multi-worker loop.

## Implementation Spec

### Step 1: Branch on \`isDomStrategy\` for the chunk loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker path (around line 560), replace the entire `while (nextFrameToWrite !== chunkEnd)` block with:
```typescript
            if (isDomStrategy) {
              while (nextFrameToWrite !== chunkEnd) {
                const ringIndex = nextFrameToWrite & ringMask;
                if (frameBufferRing[ringIndex] === null) {
                  break;
                }

                const buffer = frameBufferRing[ringIndex] as string;
                frameBufferRing[ringIndex] = null;
                const byteLength = (buffer.length * 3) >>> 2;
                pendingBytes += byteLength;
                if (!stream.write(buffer, "base64") && pendingBytes >= MAX_PENDING_BYTES) {
                  await this.drainPromise;
                  pendingBytes = 0;
                }

                nextFrameToWrite++;
              }
            } else {
              while (nextFrameToWrite !== chunkEnd) {
                const ringIndex = nextFrameToWrite & ringMask;
                if (frameBufferRing[ringIndex] === null) {
                  break;
                }

                const buffer = frameBufferRing[ringIndex] as Buffer;
                frameBufferRing[ringIndex] = null;
                pendingBytes += buffer.length;
                if (!stream.write(buffer) && pendingBytes >= MAX_PENDING_BYTES) {
                  await this.drainPromise;
                  pendingBytes = 0;
                }

                nextFrameToWrite++;
              }
            }
```
**Why**: Avoids testing `typeof buffer === "string"` on every single frame, substituting it with a single branch on `isDomStrategy` outside the tight chunk loop.

## Variations
None.

## Correctness Check
Run `npm run test --workspace=packages/renderer` to ensure frame logic outputs properly.

## Results Summary
```
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	6.265	150	23.94	63.5	keep	unrolled buffer type dispatch inside writer loops (dom)
2	8.675	150	17.29	63.6	keep	unrolled buffer type dispatch inside writer loops (dom pool=2)
```
