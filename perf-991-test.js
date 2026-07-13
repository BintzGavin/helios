const fs = require('fs');

const content = fs.readFileSync('packages/renderer/src/core/CaptureLoop.ts', 'utf8');

const searchBlock = `            if (isDomStrategy) {

                let i = 1;
                while (i < totalFrames - 1 && !aborted) {
                  const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);


                  for (; i < chunkEnd; i++) {
                    const rawResult = await nextCapturePromise;

                    timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );
                    nextCapturePromise = domBeginFrame!();

                    const data = rawResult.screenshotData;
                    let buf: Buffer;
                    if (data) {
                      domLastFrameData = data;
                      buf = Buffer.from(data as string, "base64");
                      domLastFrameBuffer = buf;
                    } else {
                      buf = domLastFrameBuffer!;
                    }

                    pendingBytes += buf.length;
                    const writeSuccessStr = stream.write(buf);

                    if (!writeSuccessStr && pendingBytes >= 16777216) {
                      await this.drainPromise;
                      pendingBytes = 0;
                    }
                  }

                  if (aborted) break;

                  if (i - 1 === nextProgress) {
                    nextProgress += progressInterval;
                    console.log(
                      \`Progress: Rendered \${i - 1} / \${totalFrames} frames\`,
                    );
                    if (onProgress) {
                      onProgress((i - 1) / totalFrames);
                    }
                  }
                }

                if (!aborted && totalFrames > 1) {
                  const rawResult = await nextCapturePromise;

                  const data = rawResult.screenshotData;
                  let buf: Buffer;
                  if (data) {
                    domLastFrameData = data;
                    buf = Buffer.from(data as string, "base64");
                    domLastFrameBuffer = buf;
                  } else {
                    buf = domLastFrameBuffer!;
                  }

                  pendingBytes += buf.length;
                  const writeSuccessStr = stream.write(buf);

                  if (!writeSuccessStr && pendingBytes >= 16777216) {
                    await this.drainPromise;
                    pendingBytes = 0;
                  }

                  i++;
                  if (i - 1 === nextProgress || i === totalFrames) {
                    if (i - 1 === nextProgress) nextProgress += progressInterval;
                    console.log(
                      \`Progress: Rendered \${i - 1} / \${totalFrames} frames\`,
                    );
                    if (onProgress) {
                      onProgress((i - 1) / totalFrames);
                    }
                  }
                }
            } else {

                let i = 1;
                while (i < totalFrames - 1 && !aborted) {
                  const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);


                  for (; i < chunkEnd; i++) {
                    const rawResult = await nextCapturePromise;

                    const timePromise = timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );

                    if (timePromise) await timePromise;
                    nextCapturePromise = strategy.capture(
                      page,
                      (i + 1) * timeStep,
                    );

                    let buf;
                    buf = strategy.processCaptureResult!(rawResult);
                    pendingBytes += (buf as any).length;
                    const writeSuccessBuf = stream.write(buf as any);

                    if (!writeSuccessBuf && pendingBytes >= 16777216) {
                      await this.drainPromise;
                      pendingBytes = 0;
                    }
                  }

                  if (aborted) break;

                  if (i - 1 === nextProgress) {
                    nextProgress += progressInterval;
                    console.log(
                      \`Progress: Rendered \${i - 1} / \${totalFrames} frames\`,
                    );
                    if (onProgress) {
                      onProgress((i - 1) / totalFrames);
                    }
                  }
                }

                if (!aborted && totalFrames > 1) {
                  const rawResult = await nextCapturePromise;

                  let buf;
                  buf = strategy.processCaptureResult!(rawResult);
                  pendingBytes += (buf as any).length;
                  const writeSuccessBuf = stream.write(buf as any);

                  if (!writeSuccessBuf && pendingBytes >= 16777216) {
                    await this.drainPromise;
                    pendingBytes = 0;
                  }

                  i++;
                  if (i - 1 === nextProgress || i === totalFrames) {
                    if (i - 1 === nextProgress) nextProgress += progressInterval;
                    console.log(
                      \`Progress: Rendered \${i - 1} / \${totalFrames} frames\`,
                    );
                    if (onProgress) {
                      onProgress((i - 1) / totalFrames);
                    }
                  }
                }
            }`;

if (content.includes(searchBlock)) {
  console.log('Search block found.');
} else {
  console.log('Search block not found.');
}
