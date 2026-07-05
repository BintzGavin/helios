const iterations = 10000000;
let progressInterval = 10;
let totalFrames = 100;
let nextFrameToWrite = 1;

let start = performance.now();
let chunkEnd1 = 0;
for (let j = 0; j < iterations; j++) {
    let chunkEnd = nextFrameToWrite + progressInterval; if (chunkEnd > totalFrames) chunkEnd = totalFrames;
    chunkEnd1 = chunkEnd;
}
let end = performance.now();
console.log(`Manual: ${end - start}ms`);

start = performance.now();
let chunkEnd2 = 0;
for (let j = 0; j < iterations; j++) {
    const chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);
    chunkEnd2 = chunkEnd;
}
end = performance.now();
console.log(`Math.min: ${end - start}ms`);

start = performance.now();
let chunkEnd3 = 0;
for (let j = 0; j < iterations; j++) {
    const limit = nextFrameToWrite + progressInterval;
    const chunkEnd = limit < totalFrames ? limit : totalFrames;
    chunkEnd3 = chunkEnd;
}
end = performance.now();
console.log(`Ternary: ${end - start}ms`);
