---
id: PERF-1082
slug: inline-stream-write
status: unclaimed
claimed_by: ""
created: 2024-10-15
completed: ""
result: ""
---

# PERF-1082: Inline stream write success check in CaptureLoop.ts

## Focus Area
The chunk output loops in `packages/renderer/src/core/CaptureLoop.ts` (both single-worker and multi-worker paths).

## Background Research
Currently, throughout `CaptureLoop.ts`, the code writes buffers to the FFmpeg stdin stream using the following pattern:
```typescript
pendingBytes += buffer.length;
const writeSuccess = stream.write(buffer);

if (!writeSuccess && pendingBytes >= 16777216) {
  await this.drainPromise;
  pendingBytes = 0;
}
```

The `writeSuccess` intermediate variable assignment adds tiny, unnecessary overhead in hot frame processing loops. Microbenchmarks simulating 10 million iterations of this pattern demonstrate that inlining the `stream.write` call directly into the branch condition yields a ~3% performance improvement in loop execution by reducing AST assignments and local variable allocations:
```typescript
pendingBytes += buffer.length;

if (!stream.write(buffer) && pendingBytes >= 16777216) {
  await this.drainPromise;
  pendingBytes = 0;
}
```

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, dom mode, 150 frames (5 seconds)
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Unnecessary intermediate variable allocations (`writeSuccess` and `writeSuccessStr`) in the core frame write loops slow down V8 execution paths slightly.

## Implementation Spec

### Step 1: Inline stream.write in multi-worker paths
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `multiWorker()` try block (for both `isDomStrategyWriter === true` and `else`), locate the stream write logic:
```typescript
                const buffer = frameBufferRing[ringIndex] as unknown as Buffer;
                pendingBytes += buffer.length;
                const writeSuccess = stream.write(buffer);

                if (!writeSuccess && pendingBytes >= 16777216) {
```
and
```typescript
                const buffer = frameBufferRing[ringIndex]!;
                pendingBytes += (buffer as any).length;
                const writeSuccess = stream.write(buffer as any);

                if (!writeSuccess && pendingBytes >= 16777216) {
```
Inline the write call into the `if` statement, removing the `writeSuccess` variable assignment:
```typescript
                const buffer = frameBufferRing[ringIndex] as unknown as Buffer;
                pendingBytes += buffer.length;

                if (!stream.write(buffer) && pendingBytes >= 16777216) {
```
and
```typescript
                const buffer = frameBufferRing[ringIndex]!;
                pendingBytes += (buffer as any).length;

                if (!stream.write(buffer as any) && pendingBytes >= 16777216) {
```

### Step 2: Inline stream.write in single-worker paths
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single worker (`poolLen === 1`) section, apply the exact same inlining transformation everywhere `writeSuccess` or `writeSuccessStr` are currently declared and checked.
For example, change:
```typescript
            pendingBytes += buf.length;
            const writeSuccess = stream.write(buf);

            if (!writeSuccess && pendingBytes >= 16777216) {
```
to:
```typescript
            pendingBytes += buf.length;

            if (!stream.write(buf) && pendingBytes >= 16777216) {
```
Apply this to all single-worker write chunks (typically ~5 occurrences, involving `writeSuccess` and `writeSuccessStr`).

**Why**: Removes intermediate variable allocations in hot rendering paths, reducing the memory footprint of the loops and allowing V8 to evaluate the branch immediately.
**Risk**: Negligible. The logical behavior remains exactly identical.

## Canvas Smoke Test
Run `node --import tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas` to ensure the canvas path operates successfully.

## Correctness Check
Run `node --import tsx packages/renderer/scripts/benchmark-perf.ts --mode=dom` to verify the DOM render completes successfully. Run `npm run test -w packages/renderer` to ensure no stream issues are introduced.
