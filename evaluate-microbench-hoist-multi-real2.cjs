const { performance } = require('perf_hooks');

// Let's test just optimizing the `isDomStrategy` loop vs `isDomStrategy` branch unrolling in the setup.
// From `PERF-833` and `PERF-834`, the fast paths for single-worker and multi-worker are already largely unswitched for `isDomStrategy`.

// But wait, there's another loop inside the writer that we could optimize:
// `while (nextFrameToWrite < totalFrames && !aborted)`
// It loops through `chunkEnd` etc. This was already optimized in PERF-862 by removing the inner `!aborted` check.

// Is there anything else?
// The single-worker path has `totalFrames > 0` checks before the loop.
// The multi-worker path has the `if (aborted || nextFrameToSubmit >= totalFrames)` which we verified can be hoisted!
// We can eliminate `if (aborted || nextFrameToSubmit >= totalFrames)` entirely by pushing `nextFrameToSubmit < totalFrames` into the `while` condition:
// `while (!aborted && nextFrameToSubmit < totalFrames)`
// We would replace:
// ```
//             while (!aborted) {
//               let i: number;
//               if (aborted || nextFrameToSubmit >= totalFrames) {
//                 i = -1;
//               } else if (
//                 nextFrameToSubmit - nextFrameToWrite <
//                 maxPipelineDepth
//               ) {
// ```
// with:
// ```
//             while (!aborted && nextFrameToSubmit < totalFrames) {
//               let i: number;
//               if (
//                 nextFrameToSubmit - nextFrameToWrite <
//                 maxPipelineDepth
//               ) {
// ```
// This eliminates a branch check per iteration!
