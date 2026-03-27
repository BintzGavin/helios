Let's review `DomStrategy.ts` changes.
```typescript
  private cdpBeginFrameParams: any = null;

  async prepare(page: Page): Promise<void> {
    ...
    this.cdpBeginFrameParams = {
      screenshot: this.cdpScreenshotParams
    };
  }

  async capture(page: Page, frameTime: number): Promise<Buffer> {
    ...
        const { screenshotData } = await this.cdpSession.send('HeadlessExperimental.beginFrame', this.cdpBeginFrameParams);
    ...
  }
```

Let's review `SeekTimeDriver.ts` changes.
```typescript
  private evaluateParams: any = null;

  async prepare(page: Page): Promise<void> {
    ...
    this.evaluateParams = {
      expression: '',
      awaitPromise: true,
      returnByValue: false
    };
  }

  async setTime(page: Page, timeInSeconds: number): Promise<void> {
    ...
      if (this.cdpSession) {
        this.evaluateParams.expression = `window.__helios_seek(${timeInSeconds}, ${this.timeout})`;
        const response = await this.cdpSession.send('Runtime.evaluate', this.evaluateParams);
    ...
```

Let's review `Renderer.ts` changes.
```typescript
        const onWriteError = (err?: Error | null) => {
            if (err) {
                ffmpegProcess.emit('error', err);
            }
        };

        let drainResolve: (() => void) | null = null;
        let drainReject: ((err: Error) => void) | null = null;

        const cleanupDrain = () => {
            ffmpegProcess.stdin.removeListener('drain', onDrain);
            ffmpegProcess.stdin.removeListener('close', onClose);
            ffmpegProcess.stdin.removeListener('error', onError);
            drainResolve = null;
            drainReject = null;
        };

        const onDrain = () => {
            if (drainResolve) drainResolve();
            cleanupDrain();
        };
        const onClose = () => {
            if (drainReject) drainReject(new Error('FFmpeg stdin closed before drain'));
            cleanupDrain();
        };
        const onError = (err: Error) => {
            if (drainReject) drainReject(err);
            cleanupDrain();
        };

        const captureLoop = async () => {
        ...
              const canWriteMore = ffmpegProcess.stdin.write(buffer, onWriteError);

              if (!canWriteMore) {
                  ffmpegProcess.stdin.once('drain', onDrain);
                  ffmpegProcess.stdin.once('close', onClose);
                  ffmpegProcess.stdin.once('error', onError);

                  previousWritePromise = new Promise<void>((resolve, reject) => {
                      drainResolve = resolve;
                      drainReject = reject;
                  });
              } else {
                  previousWritePromise = undefined;
              }
        ...
            const canWriteMore = ffmpegProcess.stdin.write(finalBuffer, onWriteError);

            if (!canWriteMore) {
                ffmpegProcess.stdin.once('drain', onDrain);
                ffmpegProcess.stdin.once('close', onClose);
                ffmpegProcess.stdin.once('error', onError);

                await new Promise<void>((resolve, reject) => {
                    drainResolve = resolve;
                    drainReject = reject;
                });
            }
```

Wait, what if `events.once` was handling multiple events? Yes, but `events.once('drain')` handles one occurrence. `stdin.once('drain', ...)` is the exact equivalent, but we also bind `close` and `error` so that if one of them fires, it rejects the promise and we cleanup the other listeners!
Wait! `once()` in Node.js automatically removes the other listeners if one fires.
If we use `stdin.once('drain', onDrain); stdin.once('close', onClose); stdin.once('error', onError);` and `onDrain` fires, it WILL remove `onDrain`, but it WILL NOT remove `onClose` and `onError`!
So `cleanupDrain` MUST use `removeListener`!

```typescript
        const cleanupDrain = () => {
            ffmpegProcess.stdin.removeListener('drain', onDrain);
            ffmpegProcess.stdin.removeListener('close', onClose);
            ffmpegProcess.stdin.removeListener('error', onError);
            drainResolve = null;
            drainReject = null;
        };
```
Yes, this correctly removes all listeners manually. Instead of using `.once`, we can use `.on` and `removeListener` handles the unbinding, OR `.once` and `removeListener` works too.

Wait! Could `onWriteError` closure be omitted entirely from `.write`?
No, the node.js `write` method doesn't throw synchronous errors for asynchronous write failures, so an error callback is necessary to catch internal stream errors.

Is there any risk here?
What if `canWriteMore` is true, and then `ffmpegProcess` errors out BEFORE the next frame?
The `Renderer.ts` already has a separate `ffmpegExitPromise` that catches `error` and `close` on `ffmpegProcess` directly, so we are safe even if we don't bind `error` listener here. The purpose of binding `error` and `close` on `stdin` is just to reject the `drain` promise so it doesn't hang!

Let's test this!
