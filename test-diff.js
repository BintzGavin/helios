const fs = require('fs');
const content = fs.readFileSync('packages/renderer/src/core/CaptureLoop.ts', 'utf8');

const s1 = `  private drainReject: ((err: Error) => void) | null = null;

  constructor(`;
const r1 = `  private drainReject: ((err: Error) => void) | null = null;

  private handleWriteError = (err?: Error | null) => {
    if (err) {
       if ((err as any).code === 'EPIPE') {
           console.warn('FFmpeg stdin closed prematurely during write (EPIPE). Ignoring error to allow graceful exit.');
       } else {
           this.ffmpegManager.emitError(err);
       }
    }
  };

  constructor(`;

const s2 = `    let previousWritePromise: Promise<void> | undefined;

    const onWriteError = (err?: Error | null) => {
        if (err) {
           if ((err as any).code === 'EPIPE') {
               console.warn('FFmpeg stdin closed prematurely during write (EPIPE). Ignoring error to allow graceful exit.');
           } else {
               this.ffmpegManager.emitError(err);
           }
        }
    };

    let nextFrameToSubmit = 0;`;
const r2 = `    let previousWritePromise: Promise<void> | undefined;

    let nextFrameToSubmit = 0;`;

const s3 = `        const writeResult = this.writeToStdin(buffer, onWriteError);
        previousWritePromise = writeResult ? writeResult : undefined;`;
const r3 = `        const writeResult = this.writeToStdin(buffer, this.handleWriteError);
        previousWritePromise = writeResult ? writeResult : undefined;`;

const s4 = `      console.log(\`Writing final buffer...\`);
      const writeResult = this.writeToStdin(finalBuffer, onWriteError);
      if (writeResult) await writeResult;
    }

    console.log('Finished sending frames. Closing FFmpeg stdin.');`;
const r4 = `      console.log(\`Writing final buffer...\`);
      const writeResult = this.writeToStdin(finalBuffer, this.handleWriteError);
      if (writeResult) await writeResult;
    }

    console.log('Finished sending frames. Closing FFmpeg stdin.');`;

console.log("1:", content.includes(s1));
console.log("2:", content.includes(s2));
console.log("3:", content.includes(s3));
console.log("4:", content.includes(s4));
