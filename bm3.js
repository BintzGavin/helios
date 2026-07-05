const iterations = 10000000;

const totalFrames = 100;
let progressInterval = 10;
let nextFrameToWrite = 5;

let start = performance.now();
for (let j = 0; j < iterations; j++) {
    let chunkEnd = nextFrameToWrite + progressInterval; if (chunkEnd > totalFrames) chunkEnd = totalFrames;
}
let end = performance.now();
console.log(`Manual: ${end - start}ms`);

start = performance.now();
for (let j = 0; j < iterations; j++) {
    const chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);
}
end = performance.now();
console.log(`Math.min: ${end - start}ms`);

start = performance.now();
for (let j = 0; j < iterations; j++) {
    const limit = nextFrameToWrite + progressInterval;
    const chunkEnd = limit < totalFrames ? limit : totalFrames;
}
end = performance.now();
console.log(`Ternary: ${end - start}ms`);
