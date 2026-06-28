const { performance } = require('perf_hooks');

// Let's test hoisting `isString` out of the loop block.
// We currently check `if (isString)` inside the multi-worker writer outer chunk.
// And `isString = typeof buffer === "string";`
// But buffer is ALWAYS a string if isDomStrategy is true, which is checked earlier.
// Wait, `isDomStrategy` isn't accessible to the multi-worker writer?
// `strategy` is passed to the capture loop, so `isDomStrategy` IS available!
