const { performance } = require('perf_hooks');

class ReusableThenable {
  constructor() {
    this.promise = Promise.resolve();
  }
}

async function runTest(unrolled) {
  let frameBufferRing = new Array(1024).fill(null);
  let writerWaiterPromise = Promise.resolve();
  let aborted = false;

  let start = performance.now();
  for (let i = 0; i < 10000000; i++) {
    frameBufferRing[0] = (i % 10 !== 0) ? {} : null;

    // Simulate what happens around line 640/705
    if (unrolled) {
      if (true /* nextFrameToWrite !== chunkEnd */) {
        const awaitIndex = 0; // nextFrameToWrite & ringMask;
        if (frameBufferRing[awaitIndex] === null) {
          do {
            await writerWaiterPromise;
            frameBufferRing[0] = {}; // simulate data coming in
          } while (frameBufferRing[awaitIndex] === null && !aborted);
          if (aborted) break;
        }
      }
    } else {
      if (true /* nextFrameToWrite !== chunkEnd */) {
        const awaitIndex = 0; // nextFrameToWrite & ringMask;
        while (frameBufferRing[awaitIndex] === null && !aborted) {
          await writerWaiterPromise;
          frameBufferRing[0] = {};
        }
        if (aborted) break;
      }
    }
  }
  let end = performance.now();
  return end - start;
}

async function main() {
  const rolled = await runTest(false);
  const unrolled = await runTest(true);
  console.log({ rolled, unrolled, improvement: (rolled - unrolled) / rolled * 100 + "%" });
}

main();
