const { performance } = require('perf_hooks');

// Benchmark base64 decode vs buffer copy
const size = 1920 * 1080 * 4;
// Let's say a typical 1080p base64 is about 1MB
const buf = Buffer.alloc(1000000, 1);
const b64 = buf.toString('base64');

const target1 = Buffer.alloc(1000000);
const target2 = Buffer.alloc(1000000);

let start = performance.now();
for(let i=0; i<1000; i++) {
    target1.write(b64, 'base64');
}
let end = performance.now();
console.log('Base64 decode:', end - start, 'ms');

const decoded = Buffer.from(b64, 'base64');
start = performance.now();
for(let i=0; i<1000; i++) {
    decoded.copy(target2);
}
end = performance.now();
console.log('Buffer copy:', end - start, 'ms');
