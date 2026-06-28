const { performance } = require('perf_hooks');

// Simulating what happens if we hoist `isDomStrategy` completely out of the hot inner logic.
// In the current CaptureLoop.ts, there are several large blocks duplicated for `if (isString)` and then inside it `if (isDomStrategy)`.
// By checking `isDomStrategy` higher up, we can branch once and have the entire loop duplicated, avoiding branches during iteration entirely, or even inside `try`.

// Since V8 branch prediction is good, let's see how much we save by hoisting `if (isDomStrategy)`
// out of the outer block. We'll simulate `while` loop with a branch inside versus outside.

function benchInside(iterations) {
    let result = 0;
    let isDomStrategy = true;
    const start = performance.now();
    let i = 0;
    while(i < iterations) {
        if (isDomStrategy) {
            result += 1;
        } else {
            result += 2;
        }
        i++;
    }
    const end = performance.now();
    return { time: end - start, result };
}

function benchOutside(iterations) {
    let result = 0;
    let isDomStrategy = true;
    const start = performance.now();
    if (isDomStrategy) {
        let i = 0;
        while(i < iterations) {
            result += 1;
            i++;
        }
    } else {
        let i = 0;
        while(i < iterations) {
            result += 2;
            i++;
        }
    }
    const end = performance.now();
    return { time: end - start, result };
}

const ITER = 100000000;
benchInside(100);
benchOutside(100);

let tIn = 0;
let tOut = 0;

for(let i=0; i<5; i++) {
    tIn += benchInside(ITER).time;
    tOut += benchOutside(ITER).time;
}

console.log(`Inside: ${tIn / 5}`);
console.log(`Outside: ${tOut / 5}`);
