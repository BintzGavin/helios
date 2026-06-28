const { performance } = require('perf_hooks');

const totalFrames = 100000;
const progressInterval = 100;
const iterations = 1000;

function testBranch() {
    let dummy = 0;
    const start = performance.now();
    for (let k = 0; k < iterations; k++) {
        let i = 0;
        while (i < totalFrames - 1) {
            let chunkEnd = i + progressInterval;
            if (chunkEnd > totalFrames - 1) chunkEnd = totalFrames - 1;
            for (; i < chunkEnd; i++) {
                dummy += i;
            }
        }
    }
    const end = performance.now();
    return end - start;
}

function testMathMin() {
    let dummy = 0;
    const start = performance.now();
    for (let k = 0; k < iterations; k++) {
        let i = 0;
        while (i < totalFrames - 1) {
            const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);
            for (; i < chunkEnd; i++) {
                dummy += i;
            }
        }
    }
    const end = performance.now();
    return end - start;
}

// Warmup
testBranch();
testMathMin();

const branchTimes = [];
const minTimes = [];

for (let i = 0; i < 5; i++) {
    branchTimes.push(testBranch());
    minTimes.push(testMathMin());
}

console.log("Branch (median ms):", branchTimes.sort()[2]);
console.log("Math.min (median ms):", minTimes.sort()[2]);
