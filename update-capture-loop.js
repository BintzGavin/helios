const fs = require('fs');

const path = 'packages/renderer/src/core/CaptureLoop.ts';
let code = fs.readFileSync(path, 'utf8');

const target1 = `              if (nextFrameToWrite !== chunkEnd) {
                const awaitIndex = nextFrameToWrite & ringMask;
                if (frameBufferRing[awaitIndex] === null) {
                  do {
                    await writerWaiterPromise;
                  } while (frameBufferRing[awaitIndex] === null && !aborted);
                  if (aborted) break;
                }
              }`;

const replacement1 = `              if (nextFrameToWrite !== chunkEnd) {
                const awaitIndex = nextFrameToWrite & ringMask;
                do {
                  await writerWaiterPromise;
                } while (frameBufferRing[awaitIndex] === null && !aborted);
                if (aborted) break;
              }`;

if (code.includes(target1)) {
  code = code.replace(target1, replacement1);
  console.log("Replaced target 1 (isDomStrategyWriter branch)");
} else {
  console.log("Could not find target 1");
}

const target2 = `              if (nextFrameToWrite !== chunkEnd) {
                const awaitIndex = nextFrameToWrite & ringMask;
                if (frameBufferRing[awaitIndex] === null) {
                  do {
                    await writerWaiterPromise;
                  } while (frameBufferRing[awaitIndex] === null && !aborted);
                  if (aborted) break;
                }
              }`;

if (code.includes(target2)) {
  code = code.replace(target2, replacement1);
  console.log("Replaced target 2 (non-isDomStrategyWriter branch)");
} else {
  console.log("Could not find target 2");
}

fs.writeFileSync(path, code);
