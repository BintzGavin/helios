const { performance } = require('perf_hooks');

const totalFrames = 10000000; // 10M frames
const progressInterval = 1000;
const iterations = 1;

function testBranch() {
    let dummy = 0;
    const start = performance.now();
    for (let k = 0; k < iterations; k++) {
        let i = 0;
        while (i < totalFrames - 1) {
            let chunkEnd = i + progressInterval;
            if (chunkEnd > totalFrames - 1) chunkEnd = totalFrames - 1;
            i = chunkEnd;
            dummy += i;
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
            i = chunkEnd;
            dummy += i;
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

for (let i = 0; i < 50; i++) {
    branchTimes.push(testBranch());
    minTimes.push(testMathMin());
}

console.log("Branch (median ms):", branchTimes.sort()[25]);
console.log("Math.min (median ms):", minTimes.sort()[25]);
