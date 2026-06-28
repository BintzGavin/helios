const { performance } = require('perf_hooks');

const iterations = 10000000;

function testBranch() {
    let dummy = 0;
    const timePromise = Promise.resolve();
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        if (timePromise) dummy += 1; // Simulate await timePromise
    }
    const end = performance.now();
    return end - start;
}

function testNoBranch() {
    let dummy = 0;
    const timePromise = Promise.resolve();
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        dummy += 1;
    }
    const end = performance.now();
    return end - start;
}

// Warmup
testBranch();
testNoBranch();

const branchTimes = [];
const minTimes = [];

for (let i = 0; i < 50; i++) {
    branchTimes.push(testBranch());
    minTimes.push(testNoBranch());
}

console.log("Branch (median ms):", branchTimes.sort()[25]);
console.log("NoBranch (median ms):", minTimes.sort()[25]);
