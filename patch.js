const fs = require('fs');
const filepath = 'packages/renderer/src/core/CaptureLoop.ts';
let code = fs.readFileSync(filepath, 'utf8');

const search = `              if (nextFrameToWrite !== chunkEnd) {
                while (frameBufferRing[nextFrameToWrite & ringMask] === null && !aborted) {
                  await writerWaiterPromise;
                }
                if (aborted) break;
              } else if (aborted) {
                break;
              }`;

const replace = `              if (aborted) break;
              if (nextFrameToWrite !== chunkEnd) {
                const awaitIndex = nextFrameToWrite & ringMask;
                while (frameBufferRing[awaitIndex] === null && !aborted) {
                  await writerWaiterPromise;
                }
                if (aborted) break;
              }`;

// There are two occurrences, replace both.
const occurrences = code.split(search).length - 1;
if (occurrences !== 2) {
    console.error(`Expected 2 occurrences of the block, found ${occurrences}`);
    process.exit(1);
}

code = code.replaceAll(search, replace);
fs.writeFileSync(filepath, code, 'utf8');
console.log('Successfully patched CaptureLoop.ts');
