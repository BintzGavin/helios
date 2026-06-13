---
id: PERF-753
slug: captureloop-eager-base64
status: complete
claimed_by: ""
created: 2024-06-13
completed: ""
result: ""
---

# PERF-753: Eager Base64 Decoding in Capture Hot Loop

## Focus Area
Frame Capture Loop (`packages/renderer/src/core/CaptureLoop.ts`). Targetting the single-worker and multi-worker fast paths for performance improvement.

## Background Research
Currently, \`DomStrategy\` uses CDP's \`HeadlessExperimental.beginFrame\` to capture frames, and the resulting \`screenshotData\` is a Base64 encoded string. The \`CaptureLoop\` relies on \`strategy.processCaptureResult!\` to extract this string, and passes it directly to \`this.ffmpegManager.stdin.write(buffer as any, 'base64')\`.

When a string is written to a Node.js stream with the 'base64' encoding parameter, Node.js internals will dynamically inspect the type, perform coercion, and instantiate a \`Buffer\` before the underlying system call. This means a new Buffer is allocated per frame by Node.js internals, and strings stay in V8's heap longer, increasing GC pressure.

We can eagerly decode the string into a \`Buffer\` directly in \`strategy.processCaptureResult\` (or directly in \`CaptureLoop.ts\`) using \`Buffer.from(string, 'base64')\`. We recently discovered in \`PERF-752\` that passing a pre-allocated \`Buffer\` directly to \`stdin.write(buffer)\` avoids branch checks, and doing the explicit conversion synchronously in the fast path may eliminate Node.js stream encoding overhead and reduce string allocation overhead before the data enters pipeline buffering or stream wait cycles.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition (\`examples/dom-benchmark\`)
- **Render Settings**: 600x600, 30fps, 5s duration, ultrafast preset
- **Mode**: \`dom\`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.579s (Local run)
- **Bottleneck analysis**: IPC string processing and stream buffering overhead for base64 strings.

## Implementation Spec

### Step 1: Eager Buffer Conversion
**File**: \`packages/renderer/src/core/CaptureLoop.ts\`
**What to change**:
In the single-worker fast path, update the result processing.
From:
\`\`\`typescript
const rawResult = await strategy.capture(page, time);
const buffer = hasProcessFn ? strategy.processCaptureResult!(rawResult) : rawResult;

if (i === nextProgressFrame) {
...
if (stdin?.writable) {
    const canWriteMore = stdin.write(buffer as any, 'base64');
\`\`\`

To eagerly decode strings to buffers right after capture, and only write the buffer without the encoding parameter (to leverage \`PERF-752\` optimizations):
\`\`\`typescript
const rawResult = await strategy.capture(page, time);
let buffer = hasProcessFn ? strategy.processCaptureResult!(rawResult) : rawResult;

if (typeof buffer === 'string') {
    buffer = Buffer.from(buffer, 'base64');
}

if (i === nextProgressFrame) {
...
if (stdin?.writable) {
    const canWriteMore = stdin.write(buffer as any);
\`\`\`

Apply the same eager decoding logic to the multi-worker path in \`runWorker\`:
\`\`\`typescript
const rawResult = await strategy.capture(page, time);
let buffer = hasProcessFn ? strategy.processCaptureResult!(rawResult) : rawResult;
if (typeof buffer === 'string') {
    buffer = Buffer.from(buffer, 'base64');
}
frameBufferRing[ringIndex] = buffer;
\`\`\`

And in the multi-worker writer loop, omit the encoding param:
\`\`\`typescript
const canWriteMore = stdin.write(buffer as any);
\`\`\`

**Why**: By explicitly converting the Base64 string to a Buffer as early as possible on the JS side, we ensure that Node stream internals don't have to perform dynamic type checking and lazy conversion. This is a known optimization for stream throughput. In the multi-worker path, this guarantees only buffers sit in the ring array, reducing memory size compared to base64 strings.
**Risk**: If V8's optimization of the base64 string transfer to C++ stream internals is faster than `Buffer.from`, this might yield no improvement or a slight regression. We will benchmark to find out.

## Variations
None.

## Canvas Smoke Test
Run \`npm run build -w packages/renderer\` to ensure no syntax errors.

## Correctness Check
Run the DOM render benchmark \`cd packages/renderer && npx tsx scripts/benchmark-perf.ts\` and verify output integrity and performance times.

## Prior Art
- PERF-602 previously attempted eager base64 buffer decoding in an older architecture layout but failed due to surrounding string overhead issues. Retrying under the current streamlined loop where we omit `stdin.write` callbacks and `processCaptureResult` bindings might yield different results.
