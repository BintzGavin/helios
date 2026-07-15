const fs = require('fs');

const content = fs.readFileSync('packages/renderer/src/core/CaptureLoop.ts', 'utf8');

// Looking for the single-worker hasProcessFn loop:
// We need to verify if the "if (hasProcessFn) {" block in single worker is unrolled properly.
