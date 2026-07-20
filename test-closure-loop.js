const ITERS = 10000000;
const ringMask = 255;
const freeWorkers = new Int32Array(256);
for (let i = 0; i < 256; i++) freeWorkers[i] = i;
const frameBufferRing = new Array(256);
const workerThenables = new Array(256);
for (let i = 0; i < 256; i++) {
  workerThenables[i] = { resolve: (val) => {} };
}

function createClosureHoist() {
  let freeWorkersHead = 100;
  let nextFrameToSubmit = 0;

  return function testHoist() {
    for (let i = 0; i < ITERS; i++) {
      let dispatches = 10;
      if (freeWorkersHead < 10) freeWorkersHead = 100;

      let h = freeWorkersHead;
      let n = nextFrameToSubmit;
      for (let d = 0; d < dispatches; d++) {
        h--;
        const w = freeWorkers[h];
        frameBufferRing[n & ringMask] = null;
        workerThenables[w].resolve(n);
        n++;
      }
      freeWorkersHead = h;
      nextFrameToSubmit = n;
    }
  }
}

function createClosureNoHoist() {
  let freeWorkersHead = 100;
  let nextFrameToSubmit = 0;

  return function testNoHoist() {
    for (let i = 0; i < ITERS; i++) {
      let dispatches = 10;
      if (freeWorkersHead < 10) freeWorkersHead = 100;

      for (let d = 0; d < dispatches; d++) {
        freeWorkersHead--;
        const w = freeWorkers[freeWorkersHead];
        const j = nextFrameToSubmit;
        nextFrameToSubmit++;
        frameBufferRing[j & ringMask] = null;
        workerThenables[w].resolve(j);
      }
    }
  }
}

const noHoist = createClosureNoHoist();
const hoist = createClosureHoist();

console.time("no hoist closure");
noHoist();
console.timeEnd("no hoist closure");

console.time("hoist closure");
hoist();
console.timeEnd("hoist closure");
