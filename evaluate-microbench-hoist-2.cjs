const { performance } = require('perf_hooks');

// Let's test hoisting `isDomStrategy` across the whole capture / worker process logic.
// In `CaptureLoop.ts` we have:
//
// ```typescript
// if (isDomStrategy) {
//    // huge dom capture process
// } else {
//    // huge canvas capture process
// }
// ```
// Actually we can check how many instructions the single worker run uses.
