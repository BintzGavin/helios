---
id: PERF-752
slug: unify-ffmpeg-stdin-write
status: complete
claimed_by: "jules"
created: 2024-06-12
completed: "2024-06-12"
result: "keep"
---

# PERF-752: Unify FFmpeg stdin write without branches

## Focus Area
`CaptureLoop.ts` - Stream writer logic in both single and multi-worker loops.

## Background Research
Currently, inside the `CaptureLoop.ts` hot paths, the buffer is piped to FFmpeg via:
```typescript
let canWriteMore: boolean;
if (typeof buffer === 'string') {
    canWriteMore = stdin.write(buffer, 'base64');
} else {
    canWriteMore = stdin.write(buffer);
}
```
This check is executed 30-60 times a second. In PERF-670, we tried to cache the `bufferIsString` variable outside the loop, but it regressed because variable access in V8 was slightly slower than the highly-optimized `typeof` operator.
However, Node.js `stream.Writable.write(chunk, encoding)` natively ignores the `encoding` parameter if `chunk` is a `Buffer`. Therefore, we can completely eliminate the `typeof` check and the conditional branching by blindly passing `'base64'` to the `write` method.

```typescript
const canWriteMore = stdin.write(buffer as any, 'base64');
```

This saves V8 from executing a type check and branch on every iteration, simplifying the loop AST.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.475s (PERF-750)
- **Bottleneck analysis**: Redundant conditional branching inside the innermost loop during IPC write.

## Implementation Spec

### Step 1: Unify FFmpeg `stdin.write` calls
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker fast path, find the FFmpeg stdin write logic and replace it:

```typescript
<<<<<<< SEARCH
                if (stdin?.writable) {
                    let canWriteMore: boolean;
                    if (typeof buffer === 'string') {
                        canWriteMore = stdin.write(buffer, 'base64');
                    } else {
                        canWriteMore = stdin.write(buffer);
                    }

                    if (!canWriteMore && stdin.writableLength >= 16777216) {
=======
                if (stdin?.writable) {
                    const canWriteMore = stdin.write(buffer as any, 'base64');

                    if (!canWriteMore && stdin.writableLength >= 16777216) {
>>>>>>> REPLACE
```

Repeat this same replacement in the multi-worker loop:
```typescript
<<<<<<< SEARCH
            if (stdin?.writable) {
                let canWriteMore: boolean;
                if (typeof buffer === 'string') {
                    canWriteMore = stdin.write(buffer, 'base64');
                } else {
                    canWriteMore = stdin.write(buffer);
                }

                if (!canWriteMore && stdin.writableLength >= 16777216) {
=======
            if (stdin?.writable) {
                const canWriteMore = stdin.write(buffer as any, 'base64');

                if (!canWriteMore && stdin.writableLength >= 16777216) {
>>>>>>> REPLACE
```

Repeat this same replacement at the end of the `run()` method for `finalBuffer`:
```typescript
<<<<<<< SEARCH
      if (stdin?.writable) {
          let canWriteMore: boolean;
          if (typeof finalBuffer === 'string') {
              canWriteMore = stdin.write(finalBuffer, 'base64');
          } else {
              canWriteMore = stdin.write(finalBuffer);
          }
          if (!canWriteMore) {
=======
      if (stdin?.writable) {
          const canWriteMore = stdin.write(finalBuffer as any, 'base64');
          if (!canWriteMore) {
>>>>>>> REPLACE
```

**Why**: Eliminates a dynamic branch in the hottest part of the write loop by leveraging Node.js's native `Buffer` type handling in streams, decreasing AST complexity.
**Risk**: Negligible. Node.js officially ignores encoding arguments when passing `Buffer`s to `Writable.write`.

## Correctness Check
Run the canvas tests to ensure the fallback strategy (`CanvasStrategy`), which returns `Buffer`, is not affected by passing `'base64'` to `write()` (e.g. `npx tsx scripts/verify-codecs.ts`).
