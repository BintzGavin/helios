---
id: PERF-268
slug: base64-string-capture
status: unclaimed
claimed_by: ""
created: 2026-04-13
completed: ""
result: ""
---

# PERF-268: Return Base64 String directly from CanvasStrategy WebCodecs capture

## 1. Context & Goal
During DOM capture when using WebCodecs, `CanvasStrategy` currently receives a base64 string from the browser context but allocates a new Node.js Buffer via `Buffer.from(chunkData, 'base64')` for every frame in the `captureWebCodecs` method. The `CaptureLoop` and `FFmpegManager` already support passing raw base64 strings directly to the `stdin.write(buffer, 'base64')` stream. By returning the raw string instead of a Buffer, we eliminate a heavy dynamic Buffer allocation per frame, reducing memory pressure and execution time.

## 2. File Inventory
- `packages/renderer/src/strategies/CanvasStrategy.ts`

## 3. Implementation Spec
- **Architecture**: Modify `capture`, `captureWebCodecs`, and `finish` methods in `CanvasStrategy.ts` to return `Promise<Buffer | string>`. Instead of `Buffer.from(chunkData, 'base64')`, return `chunkData` directly.
- **Pseudo-Code**:
```typescript
  // In packages/renderer/src/strategies/CanvasStrategy.ts
  async capture(page: Page, frameTime: number): Promise<Buffer | string> {
      // ...
  }

  private async captureWebCodecs(page: Page, frameTime: number): Promise<Buffer | string> {
    // ...
    if (chunkData && chunkData.length > 0) {
        return chunkData; // Return string directly instead of Buffer.from(chunkData, 'base64')
    }
    return Buffer.alloc(0);
  }

  async finish(page: Page): Promise<Buffer | string | void> {
    // ...
      if (chunkData && chunkData.length > 0) {
        return chunkData; // Return string directly instead of Buffer.from(chunkData, 'base64')
      }
    // ...
  }
```
- **Public API Changes**: `CanvasStrategy.capture` and `CanvasStrategy.finish` return type broadened to `Promise<Buffer | string | void>`, which is already supported by the `RenderStrategy` interface.
- **Dependencies**: None

## 4. Test Plan
Run `benchmark-test.js` to ensure the frames are still correctly piped to FFmpeg.
