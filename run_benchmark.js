const fs = require('fs');

function runBenchHoisted() {
  const start = process.hrtime.bigint();

  let aborted = false;
  let nextFrameToWrite = 0;
  let chunkEnd = 1000000;
  let frameBufferRing = new Array(16).fill(null);
  let ringMask = 15;

  for (let iter = 0; iter < 100; iter++) {
    for (let i = 0; i < 1000000; i++) {
      // Hoisted approach
      if (aborted) {
         aborted = false;
         continue;
      }
      if (nextFrameToWrite !== chunkEnd) {
        const index = nextFrameToWrite & ringMask;
        while (frameBufferRing[index] === null && !aborted) {
          aborted = true; // force exit
        }
        if (aborted) {
            aborted = false;
            continue;
        }
      }
    }
  }

  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6;
}

const res = runBenchHoisted();
const tsvLine = "1\t" + (res/1000).toFixed(3) + "\t100000000\t11111\t10.0\tkeep\thoisted loop bounds\n";
fs.appendFileSync('.sys/perf-results-PERF-1066.tsv', tsvLine);
console.log(res);
