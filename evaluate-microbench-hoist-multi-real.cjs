const { performance } = require('perf_hooks');

// Benchmark the real logic inside the loop!

function benchCurrent(iterations) {
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
    while (!aborted) {
        let i;
        if (aborted || nextFrameToSubmit >= totalFrames) {
            i = -1;
        } else if (nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth) {
            i = nextFrameToSubmit++;
            const ringIndex = i & ringMask;
            frameReadyRing[ringIndex] = 0;
            frameBufferRing[ringIndex] = null;
        } else {
            // simulate wait
            freeWorkers[freeWorkersHead++] = workerIndex;
            checkState();
            nextFrameToWrite++;
            i = nextFrameToSubmit++; // simulate await returned value
        }

        if (i === -1) break;

        const ringIndex = i & ringMask;
        result += i;
        frameBufferRing[ringIndex] = "buffer";
        frameReadyRing[ringIndex] = 1;
    }
    const end = performance.now();
    return { time: end - start, result };
}

function benchOptimized(iterations) {
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
            // simulate wait
            freeWorkers[freeWorkersHead++] = workerIndex;
            checkState();
            nextFrameToWrite++;
            i = nextFrameToSubmit++; // simulate await returned value
        }

        if (i === -1) break; // still need this for await abort!

        const ringIndex = i & ringMask;
        result += i;
        frameBufferRing[ringIndex] = "buffer";
        frameReadyRing[ringIndex] = 1;
    }
    const end = performance.now();
    return { time: end - start, result };
}

const ITER = 10000000;
benchCurrent(100);
benchOptimized(100);

let tCur = 0;
let tOpt = 0;

for(let i=0; i<10; i++) {
    tCur += benchCurrent(ITER).time;
    tOpt += benchOptimized(ITER).time;
}

console.log(`Current: ${tCur / 10} ms`);
console.log(`Optimized: ${tOpt / 10} ms`);
