const { performance } = require('perf_hooks');

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
            nextFrameToWrite += 1; // someone else advanced it
            i = -2; // simulate skipping wait for synchronous loop
        }

        if (i === -1) break;
        if (i === -2) continue;

        // do work
        result += i;
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
            nextFrameToWrite += 1;
            i = -2;
        }

        if (i === -2) continue;

        // do work
        result += i;
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
