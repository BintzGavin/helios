const totalFrames = 5;
const progressInterval = Math.max(1, Math.floor(totalFrames / 10)); // <---- FIX
let i = 1;
let nextProgress = progressInterval;
let iterations = 0;

while (i < totalFrames - 1) {
  let chunkEnd = i + progressInterval;
  if (chunkEnd > totalFrames - 1) chunkEnd = totalFrames - 1;

  for (; i < chunkEnd; i++) {
    // simulate work
  }

  if (i - 1 === nextProgress) {
    nextProgress += progressInterval;
  }

  iterations++;
  if (iterations > 10) {
    console.log("INFINITE LOOP DETECTED");
    break;
  }
}
console.log("Iterations:", iterations)
