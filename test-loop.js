const ITERS = 10000000;
const ringMask = 255;
const freeWorkers = new Int32Array(256);
for (let i = 0; i < 256; i++) freeWorkers[i] = i;
const frameBufferRing = new Array(256);
const workerThenables = new Array(256);
for (let i = 0; i < 256; i++) {
  workerThenables[i] = { resolve: (val) => {} };
}

function testHoist() {
  let freeWorkersHead = 100;
  let nextFrameToSubmit = 0;

  for (let i = 0; i < ITERS; i++) {
    let dispatches = 10;
    // reset head
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

function testNoHoist() {
  let freeWorkersHead = 100;
  let nextFrameToSubmit = 0;

  for (let i = 0; i < ITERS; i++) {
    let dispatches = 10;
    // reset head
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

console.time("no hoist (original checkState)");
testNoHoist();
console.timeEnd("no hoist (original checkState)");

console.time("hoist (isDomStrategyWriter style)");
testHoist();
console.timeEnd("hoist (isDomStrategyWriter style)");
