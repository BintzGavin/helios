const { performance } = require('perf_hooks');

// Can we optimize further by completely avoiding `if (i === -1)` inside the fast path?
// Wait, `i === -1` ONLY happens when a worker wakes up from `await workerThenables[workerIndex]`
// and `aborted` was set to true while it was waiting!
// If we are in the fast path (`nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth`), `i` is NEVER `-1`.
// We can structure it like this:

function benchHyperOptimized(iterations) {
    let result = 0;
    let aborted = false;
    let nextFrameToSubmit = 0;
    let nextFrameToWrite = 0;
    let totalFrames = iterations;
    const maxPipelineDepth = 5;

    let ringMask = 7;
    let frameReadyRing = new Array(8).fill(0);
    let frameBufferRing = new Array(8).fill(null);
    let freeWorkersHead = 0;
    let freeWorkers = new Array(8).fill(0);
    let workerThenables = new Array(8).fill({ resolve: (v) => v });
    let workerIndex = 0;
    let checkState = () => {};

    const start = performance.now();
    while (!aborted && nextFrameToSubmit < totalFrames) {
        let i;
        if (nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth) {
            i = nextFrameToSubmit++;
            const ringIndex = i & ringMask;
            frameReadyRing[ringIndex] = 0;
            frameBufferRing[ringIndex] = null;
        } else {
            // slow path
            freeWorkers[freeWorkersHead++] = workerIndex;
            checkState();
            nextFrameToWrite++;
            i = nextFrameToSubmit++;
            if (i === -1) break;
        }

        const ringIndex = i & ringMask;
        result += i;
        frameBufferRing[ringIndex] = "buffer";
        frameReadyRing[ringIndex] = 1;
    }
    const end = performance.now();
    return { time: end - start, result };
}
console.log(`HyperOptimized: ${benchHyperOptimized(10000000).time}`);
