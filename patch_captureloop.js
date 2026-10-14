const fs = require('fs');
const filepath = 'packages/renderer/src/core/CaptureLoop.ts';
let code = fs.readFileSync(filepath, 'utf8');

const original_writer = `              if (freeWorkersHead > 0) {

                let dispatches = (nextFrameToWrite + maxPipelineDepth < totalFrames ? nextFrameToWrite + maxPipelineDepth : totalFrames) - nextFrameToSubmit;
                if (dispatches > 0) {
                  dispatches = dispatches < freeWorkersHead ? dispatches : freeWorkersHead;
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
                if (nextFrameToSubmit === totalFrames) {
                  let head = freeWorkersHead;
                  while (head !== 0) {
                    head--;
                    const w = freeWorkers[head];
                    workerThenables[w].resolve(-1);
                  }
                  freeWorkersHead = 0;
                }
              }`;

const original_writer_replaced = `              if (freeWorkersHead !== 0) {
                const limit = nextFrameToWrite + maxPipelineDepth;
                let dispatches = (limit < totalFrames ? limit : totalFrames) - nextFrameToSubmit;
                if (dispatches > 0) {
                  dispatches = dispatches < freeWorkersHead ? dispatches : freeWorkersHead;
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
                if (nextFrameToSubmit === totalFrames) {
                  let head = freeWorkersHead;
                  while (head !== 0) {
                    head--;
                    const w = freeWorkers[head];
                    workerThenables[w].resolve(-1);
                  }
                  freeWorkersHead = 0;
                }
              }`;

code = code.replace(original_writer, original_writer_replaced);
code = code.replace(original_writer, original_writer_replaced);

const checkStateOriginal = `        // See if we can assign tasks to waiting workers

                  let dispatches = (nextFrameToWrite + maxPipelineDepth < totalFrames ? nextFrameToWrite + maxPipelineDepth : totalFrames) - nextFrameToSubmit;
                  if (dispatches > 0) {
                    dispatches = dispatches < freeWorkersHead ? dispatches : freeWorkersHead;
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

        // If we still have waiting workers but are at totalFrames, tell them to stop
        if (nextFrameToSubmit === totalFrames) {
          let head = freeWorkersHead;
          while (head !== 0) {
            head--;
            const w = freeWorkers[head];
            workerThenables[w].resolve(-1);
          }
          freeWorkersHead = 0;
        }`;

const checkStatePatch = `        // See if we can assign tasks to waiting workers
        if (freeWorkersHead !== 0) {
                  const limit = nextFrameToWrite + maxPipelineDepth;
                  let dispatches = (limit < totalFrames ? limit : totalFrames) - nextFrameToSubmit;
                  if (dispatches > 0) {
                    dispatches = dispatches < freeWorkersHead ? dispatches : freeWorkersHead;
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

          // If we still have waiting workers but are at totalFrames, tell them to stop
          if (nextFrameToSubmit === totalFrames) {
            let head = freeWorkersHead;
            while (head !== 0) {
              head--;
              const w = freeWorkers[head];
              workerThenables[w].resolve(-1);
            }
            freeWorkersHead = 0;
          }
        }`;

code = code.replace(checkStateOriginal, checkStatePatch);

fs.writeFileSync(filepath, code);
