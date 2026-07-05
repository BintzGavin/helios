const iterations = 10000000;

let sum1 = 0;
let start = performance.now();
for (let j = 0; j < iterations; j++) {
    const val = Math.max(1, j);
    sum1 += val;
}
let end = performance.now();
console.log(`Math.max: ${end - start}ms`);

let sum2 = 0;
start = performance.now();
for (let j = 0; j < iterations; j++) {
    let val = j;
    if (val < 1) val = 1;
    sum2 += val;
}
end = performance.now();
console.log(`Manual: ${end - start}ms`);

console.log(sum1 === sum2);
