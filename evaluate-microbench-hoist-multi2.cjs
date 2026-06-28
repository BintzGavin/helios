const { performance } = require('perf_hooks');
function benchSuperOptimized(iterations) {
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

    const start = performance.now();
    while (!aborted) {
        if (nextFrameToSubmit >= totalFrames) break;
        let i;
        if (nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth) {
            i = nextFrameToSubmit++;
            const ringIndex = i & ringMask;
            frameReadyRing[ringIndex] = 0;
            frameBufferRing[ringIndex] = null;
        } else {
            // simulate wait
            nextFrameToWrite += 1;
            continue;
        }

        // do work
        result += i;
    }
    const end = performance.now();
    return { time: end - start, result };
}

console.log(`SuperOptimized: ${benchSuperOptimized(10000000).time}`);
