const { performance } = require('perf_hooks');

// In multi-worker writing:
// ```typescript
//    try {
//        let isString: boolean | null = null;
//        let nextProgress = progressInterval;
//        if (nextFrameToWrite < totalFrames && !aborted) {
//          while (!aborted) { ... }
// ```
// It pulls the first frame, checks if it's a string, writes it, then breaks out.
// Then it branches: `if (!aborted && isString) { while (...) { ... } } else { while (...) { ... } }`
// The `isString` branch unswitching is ALREADY done for the multi-worker chunk loop!
// Wait, is it? Yes, we have two `while (nextFrameToWrite < totalFrames && !aborted)` loops.
