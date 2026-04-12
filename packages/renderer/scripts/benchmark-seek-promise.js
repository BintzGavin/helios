const iterations = 1000000;

function runTest1() {
    let sum = 0;

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        const closure = ([t, timeoutMs]) => { sum += t + timeoutMs; };
        closure([1, 2]);
    }
    return performance.now() - start;
}

const closurePrebound = ([t, timeoutMs]) => { }; // fake closure

function runTest2() {
    let sum = 0;
    const closurePrebound = ([t, timeoutMs]) => { sum += t + timeoutMs; };

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        closurePrebound([1, 2]);
    }
    return performance.now() - start;
}

console.log("Test 1 (allocate per iteration):", runTest1(), "ms");
console.log("Test 2 (pre-allocated):", runTest2(), "ms");
