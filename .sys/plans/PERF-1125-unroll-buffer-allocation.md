---
id: PERF-1125
slug: unroll-buffer-allocation
status: unclaimed
claimed_by: ""
created: 2024-10-22
completed: ""
result: ""
---
# PERF-1125: Unroll Buffer allocation in `CaptureLoop.ts` single-worker loop

## Focus Area
DOM rendering loop (`CaptureLoop.ts`). Target: V8 CPU overhead caused by inner block scoping and `const`/`let` bindings in tight loops.

## Background Research
In the single-worker `isDomStrategy` paths in `CaptureLoop.ts`, we currently allocate the decoded base64 string directly inside the loop:
`domLastFrameBuffer = Buffer.from(rawResult as string, "base64");`
`const buf = domLastFrameBuffer!;`
`let buf: Buffer = Buffer.from(rawResult as string, "base64");`
These buffer references and reassignments, especially intermediate variables like `buf`, add slight lexical environment overhead in the parser.
By hoisting or simply reusing a single variable reference instead of declaring `let buf` or `const buf` repeatedly inside the nested loop blocks, we can simplify V8 TurboFan's scope chain analysis, improving JIT compilation efficiency. (Note: this is related to but distinct from actually pooling memory, this targets the JS variable environment).

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition.
- **Render Settings**: 1080p, 60fps, fixed duration.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.647s
- **Bottleneck analysis**: Micro-optimizing AST scope depth inside hot single-worker frame iterators.

## Implementation Spec

### Step 1: Remove redundant variable blocks
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Instead of:
```typescript
domLastFrameBuffer = Buffer.from(rawResult as string, "base64");
const buf = domLastFrameBuffer!;
pendingBytes += buf.length;
```
Just inline the reference directly to `domLastFrameBuffer` if it's already set, or assign it without intermediate block scoped `const buf`.
`domLastFrameBuffer = Buffer.from(rawResult as string, "base64");`
`pendingBytes += domLastFrameBuffer.length;`
`if (!stream.write(domLastFrameBuffer) && pendingBytes >= MAX_PENDING_BYTES)`

For the single worker fast path:
Instead of:
```typescript
let buf: Buffer = Buffer.from(rawResult as string, "base64");
domLastFrameBuffer = buf;
```
Directly use `domLastFrameBuffer`:
```typescript
domLastFrameBuffer = Buffer.from(rawResult as string, "base64");
```
And use it directly in the subsequent write operation.

**Why**: Simplifies lexical bindings.
**Risk**: None.

## Correctness Check
Run canvas/dom tests to ensure frame encoding continues correctly.
