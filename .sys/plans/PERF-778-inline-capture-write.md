---
id: PERF-778
slug: inline-capture-write
status: complete
claimed_by: "executor-session"
created: 2024-06-16
completed: "2024-06-16"
result: "failed"
---
# PERF-778: Inline strategy.capture() into stdin.write()

## Focus Area
The single-worker hot loop in `CaptureLoop.ts`. Specifically targeting the intermediate variable allocation and separate AST statement for processing and writing the capture buffer.

## Background Research
In the innermost rendering loop (`packages/renderer/src/core/CaptureLoop.ts`), the fast path currently allocates a local variable `buffer` to hold the result of `strategy.capture()` (and potentially `strategy.processCaptureResult()`), which is then passed to `stdin.write()`.
V8 optimization can sometimes handle this efficiently, but explicitly inlining the await and function calls directly into the `stdin.write()` argument can eliminate a local scope variable assignment entirely, simplifying the AST that TurboFan processes. This also slightly reduces closure lifetime for the buffer object, encouraging faster garbage collection / lowering GC pressure in the monomorphic single-worker path.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~12.8s (from recent run)
- **Bottleneck analysis**: The micro-operations within the single-worker `CaptureLoop` `for` loop are the primary bottleneck per frame. Variable allocation `const buffer = ...` creates slight GC pressure and increases the number of AST nodes V8 must optimize.

## Implementation Spec

### Step 1: Inline buffer assignment in single worker fast path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside `if (hasProcessFn)` fast path `for` loop:
Change:
\`\`\`typescript
const buffer = strategy.processCaptureResult!(await strategy.capture(page, time));

if (i === nextProgressFrame) {
// ...
\`\`\`
To:
\`\`\`typescript
if (i === nextProgressFrame) {
// ...
\`\`\`
And change the stream write part:
\`\`\`typescript
const canWriteMore = stdin.write(buffer as any);
\`\`\`
To:
\`\`\`typescript
const canWriteMore = stdin.write(strategy.processCaptureResult!(await strategy.capture(page, time)) as any);
\`\`\`

Inside `else` fast path `for` loop:
Change:
\`\`\`typescript
const buffer = await strategy.capture(page, time);

if (i === nextProgressFrame) {
// ...
\`\`\`
To:
\`\`\`typescript
if (i === nextProgressFrame) {
// ...
\`\`\`
And change the stream write part:
\`\`\`typescript
const canWriteMore = stdin.write(buffer as any);
\`\`\`
To:
\`\`\`typescript
const canWriteMore = stdin.write((await strategy.capture(page, time)) as any);
\`\`\`
(Be careful to adjust the progress logging code so it continues to function as expected but without depending on the `buffer` variable).

**Why**: By completely removing the intermediate `buffer` allocation and passing the resolved value directly to `stdin.write()`, we minimize CPU instruction overhead per frame and make the AST more concise.
**Risk**: Negligible risk to correctness, since it's functionally identical. Minor risk that V8 handles the inlined code slightly differently, but historically V8 prefers inline execution for hot paths.

## Variations
N/A

## Correctness Check
Verify that the output MP4 compiles successfully without truncation and visual output remains identical.

## Prior Art
- PERF-777 (Bypass stream writable getter)

## Results Summary
- **Best render time**: 2.636s (vs baseline ~2.3s)
- **Improvement**: Regressed
- **Kept experiments**:
- **Discarded experiments**: Inline strategy.capture() into stdin.write()
