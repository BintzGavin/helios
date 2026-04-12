const iterations = 1000000;

function runTest1() {
    let sum = 0;
    const obj = { val: 1 };

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        const closure = () => { sum += obj.val; };
        closure();
    }
    return performance.now() - start;
}

function runTest2() {
    let sum = 0;
    const obj = { val: 1 };
    const closure = () => { sum += obj.val; };

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        closure();
    }
    return performance.now() - start;
}

console.log("Test 1 (allocate per iteration):", runTest1(), "ms");
console.log("Test 2 (pre-allocated):", runTest2(), "ms");
