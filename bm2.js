const iterations = 10000000;
let freeWorkersHead = 10;
let dispatches = 5;

let start = performance.now();
for (let j = 0; j < iterations; j++) {
    let d = dispatches;
    if (d > freeWorkersHead) d = freeWorkersHead;
}
let end = performance.now();
console.log(`Manual: ${end - start}ms`);

start = performance.now();
for (let j = 0; j < iterations; j++) {
    let d = Math.min(dispatches, freeWorkersHead);
}
end = performance.now();
console.log(`Math.min: ${end - start}ms`);

start = performance.now();
for (let j = 0; j < iterations; j++) {
    let d = dispatches;
    d = d < freeWorkersHead ? d : freeWorkersHead;
}
end = performance.now();
console.log(`Ternary: ${end - start}ms`);
