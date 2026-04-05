# PERF-187: Replace startScreencast with beginFrame for dom strategy targetElementHandle captures

## Focus Area
DOM strategy fallback logic when `targetElementHandle` is present.

## Background Research
Currently, when a `targetSelector` is provided in `DomStrategy.ts`, the renderer calculates the bounding box and uses `HeadlessExperimental.beginFrame` with `clip` parameters. However, the execution environment (Jules microVM) lacks GPU support, and relying on `startScreencast` in earlier versions proved ineffective (PERF-153). Replacing `startScreencast` with `beginFrame` yielded significant improvements (PERF-184).

Looking closely at `DomStrategy.ts`, the fallback logic when a `targetSelector` is provided (i.e., `targetElementHandle` is populated) uses `page.screenshot` or `targetElementHandle.screenshot` if the `boundingBox()` is not returned or CDP session is missing. But the hot loop is currently using `beginFrame` for `targetElementHandle`.

Wait, looking at `DomStrategy.ts`:
```typescript
  capture(page: Page, frameTime: number): Promise<Buffer> {
    if (this.targetElementHandle) {
      if (this.cdpSession) {
        return this.targetElementHandle.boundingBox().then((box: any) => {
          if (box) {
            return this.cdpSession!.send('HeadlessExperimental.beginFrame', { ... })
```
It looks like it already uses `beginFrame`.
