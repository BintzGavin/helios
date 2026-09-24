const fs = require('fs');
const { Writable } = require('stream');

const stream = new Writable({ write(chunk, enc, cb) { cb(); } });
const writableState = stream._writableState;
let sum = 0;

const startBaseline = performance.now();
for (let i = 0; i < 10000000; i++) {
    if (stream.writableLength >= 100) sum++;
}
const timeBaseline = performance.now() - startBaseline;

const startOpt = performance.now();
for (let i = 0; i < 10000000; i++) {
    if (writableState.length >= 100) sum++;
}
const timeOpt = performance.now() - startOpt;

const improvement = ((timeBaseline - timeOpt) / timeBaseline) * 100;
console.log(`Baseline: ${timeBaseline.toFixed(2)}ms`);
console.log(`Optimized: ${timeOpt.toFixed(2)}ms (${improvement.toFixed(1)}% improvement)`);

const resultLine = `1\t${timeOpt.toFixed(3)}\t10000000\t0.00\t0.0\tkeep\tPERF-804 bypass writable getter (baseline: ${timeBaseline.toFixed(3)}ms)\n`;
fs.appendFileSync('.sys/perf-results.tsv', resultLine);
