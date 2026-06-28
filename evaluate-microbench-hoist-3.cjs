const { performance } = require('perf_hooks');

// In single-worker paths, isDomStrategy is currently branched repeatedly inside the fast chunk loops.
// Let's look at `isString = true` and `isDomStrategy = true`.
// Right now the code unrolls `isDomStrategy` across the whole main capture block:
//
// if (isDomStrategy) {
//     while (i < totalFrames - 1) {
//         for (; i < chunkEnd; i++) {
//             ...
//         }
//     }
// }
//
// But wait, PERF-834 and PERF-833 unswitched isDomStrategy in single worker fast paths.
// However, looking at the code I see `isDomStrategy` branches inside the single worker loop initialization block:
//
//           if (totalFrames > 0) {
//             ...
//             if (isDomStrategy) {
//               nextCapturePromise = domBeginFrame!();
//             } else {
//               nextCapturePromise = strategy.capture(page, 0);
//             }
//           }
//
//           if (totalFrames > 0) {
//             const rawResult = await nextCapturePromise;
//             if (1 < totalFrames) {
//               ...
//               if (isDomStrategy) {
//                 nextCapturePromise = domBeginFrame!();
//               } else {
//                 nextCapturePromise = strategy.capture(page, timeStep);
//               }
//             }
//             let buffer;
//             if (isDomStrategy) { ... } else { ... }
//             ...
//             isString = typeof buffer === "string";
//             ...
//
// And similarly inside the single-worker final frame extraction:
//
//                   if (!aborted && totalFrames > 0) {
//                     const rawResult = await nextCapturePromise;
//                     let buf;
//                     if (isDomStrategy) {
//                       const data = rawResult.screenshotData;
//                       if (data) {
//                         domLastFrameData = data;
//                       }
//                       buf = domLastFrameData as string;
//                     } else { ... }
//
// Let's benchmark the cost of checking `isDomStrategy` repeatedly for the setup and teardown.
// Setup and teardown run exactly ONCE per composition render. It is negligible!
// The hot loop is the `while` loop, and there `isDomStrategy` is already hoisted OUT of the `while` loop:
// `if (isDomStrategy) { let i = 1; while (...) { ... } }`
//
// Wait, is it? Let's check the multi-worker path.
// The multi-worker `workerPromise` is initialized in a loop:
// `for (let w = 0; w < numWorkers; w++) { ... }`
// and inside each worker function, `isDomStrategy` is hoisted:
// `if (isDomStrategy) { while (!aborted) { ... } } else { while (!aborted) { ... } }`
// Yes, we can see `if (isDomStrategy) { while (!aborted) { ... } }` in lines 1107 and 1202.

// Is there any hot loop where `isDomStrategy` is NOT hoisted?
// Let's review the grep output.
