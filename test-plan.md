Let's analyze `SeekTimeDriver.ts`.
Wait, inside `window.__helios_seek`:
```javascript
          let promises = null;

          // 1. Wait for Fonts
          if (t === 0 && document.fonts && document.fonts.ready) {
            if (!promises) promises = [];
            promises[promises.length] = document.fonts.ready;
          }

          // 2. Synchronize media elements (video, audio)
          if (!cachedMediaElements) {
            cachedMediaElements = findAllMedia(document);
          }
          if (cachedMediaElements.length > 0) {
            for (let i = 0; i < cachedMediaElements.length; i++) {
              const el = cachedMediaElements[i];
              syncMedia(el, t);

              if (el.seeking || el.readyState < 2) {
                if (!promises) promises = [];
                promises[promises.length] = new Promise((resolve) => {
                  ...
```
This is fully optimized array operations without using Array methods that create closures.

What about `Renderer.ts` capture loop?
```typescript
                  const framePromise = (async () => {
                      try {
                          await worker.activePromise;
                      } catch (e) {
                          // Ignore previous errors to allow chain to continue (or abort)
                      }
                      await worker.timeDriver.setTime(worker.page, compositionTimeInSeconds);
                      return await worker.strategy.capture(worker.page, time);
                  })();
```
This creates an async IIFE for each frame.
Wait, `return await worker.strategy.capture` doesn't need `await` since it returns a promise.
Wait, if it is in a try-catch, maybe it does? No, it's not in a try-catch.
Wait, `async` function always wraps its return in a promise.

What if we could send raw pixel buffers directly to ffmpeg without encoding them to PNG/JPEG first?
Currently `DomStrategy` capture does:
```typescript
        const { screenshotData } = await this.cdpSession.send('HeadlessExperimental.beginFrame', {
          screenshot: this.cdpScreenshotParams
        });
        if (screenshotData) {
          const buffer = Buffer.from(screenshotData, 'base64');
```
This implies the browser encodes the frame to WebP/JPEG, converts it to base64, sends it via CDP to Node.js, Node.js decodes the base64, then pipes the buffer to FFmpeg, which decodes the WebP/JPEG and then encodes it to H.264.

Can we bypass `HeadlessExperimental.beginFrame` encoding and base64?
No, CDP `beginFrame`'s `screenshotData` is the only way to get the frame from the browser natively through Playwright.

Wait, what if we use `mjpeg` codec in the browser directly? Oh wait, it already does that! `format: 'jpeg'` or `'webp'`.
Can we use raw pixels? No.

Wait, `Renderer.ts` uses `promise.all` to execute multiple `createPage` but the loop in `Renderer.ts`:

```typescript
              // Refill the active pipeline up to the pool size
              while (nextFrameToSubmit < totalFrames && (nextFrameToSubmit - nextFrameToWrite) < pool.length * 8) {
                  const frameIndex = nextFrameToSubmit;
                  const worker = pool[frameIndex % pool.length];
...
                  const framePromise = (async () => {
...
```

Wait! In `Renderer.ts`, we do this:
```typescript
              const buffer = await framePromises[nextFrameToWrite]!;
              framePromises[nextFrameToWrite] = null as any; // Allow GC
```
This means we await them sequentially. But the array was created with `new Array(totalFrames)`.
Wait, look at `FFmpegBuilder.ts`.
Is there anything we can optimize?

Let's look at `DomStrategy.ts`.
```typescript
          const { screenshotData } = await this.cdpSession.send('HeadlessExperimental.beginFrame', {
            screenshot
          });
```
This requires an allocation of `{ screenshot }` object every frame!
Wait:
```typescript
    if (this.targetElementHandle) {
      if (this.cdpSession) {
        const box = await this.targetElementHandle.boundingBox();
        if (box) {
          const screenshot = { ...this.cdpScreenshotParams };
          screenshot.clip = { ... };
          const { screenshotData } = await this.cdpSession.send('HeadlessExperimental.beginFrame', {
            screenshot
          });
```
Wait, if there is NO target selector:
```typescript
    try {
      if (this.cdpSession) {
        const { screenshotData } = await this.cdpSession.send('HeadlessExperimental.beginFrame', {
          screenshot: this.cdpScreenshotParams
        });
```
Here, `{ screenshot: this.cdpScreenshotParams }` is allocated every frame.
We can cache this object in `prepare`!
```typescript
    this.cdpBeginFrameParams = {
        screenshot: this.cdpScreenshotParams
    };
```
And then in `capture`:
```typescript
        const { screenshotData } = await this.cdpSession.send('HeadlessExperimental.beginFrame', this.cdpBeginFrameParams);
```
That saves one object allocation per frame.
But how much time will it save? Probably imperceptible.

What else?
`SeekTimeDriver.ts`:
```typescript
          expression: `window.__helios_seek(${timeInSeconds}, ${this.timeout})`,
```
This creates a string every single frame: `"window.__helios_seek(0.0333333, 30000)"`.
Could we use `Runtime.callFunctionOn` instead to avoid creating strings?
Wait, the research docs explicitly say:
"Replaced CDPSession string Runtime.evaluate with a pre-compiled function using Runtime.callFunctionOn in the SeekTimeDriver's frame capture loop. Render time was virtually identical to baseline (32.494s vs baseline 32.324s, +0.5% regression within noise margins). It seems Chromium V8 caching for small, repeated string evaluations via CDP is already highly optimized"

Okay, let's look at `docs/status/RENDERER-EXPERIMENTS.md` again.
