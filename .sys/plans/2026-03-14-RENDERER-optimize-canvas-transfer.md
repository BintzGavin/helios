# 2026-03-14-RENDERER-optimize-canvas-transfer.md

#### 1. Context & Goal
- **Objective**: Optimize the data transfer between Browser and Node.js in `CanvasStrategy` by replacing slow JavaScript serialization with native `Blob` and `FileReader` APIs.
- **Trigger**: The current implementation uses `String.fromCharCode` in a loop to convert large `ArrayBuffer`s to Base64 (confirmed in `packages/renderer/src/strategies/CanvasStrategy.ts`). This is `O(N)` in JS and causes performance bottlenecks or stack overflows on high-res frames.
- **Impact**: Significantly faster frame capture in Canvas mode, reducing overhead for 4K/60fps rendering and improving backpressure handling by clearing buffers faster.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts`
  - Refactor `captureWebCodecs` method
  - Refactor `finish` method
- **Read-Only**: `packages/renderer/src/types.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Replace the manual iteration over `ArrayBuffer` chunks and byte-by-byte string construction.
  - Use `new Blob(chunks)` to create a single binary object from the chunk array. This leverages native C++ concatenation.
  - Use `FileReader.readAsDataURL(blob)` to encode the blob to Base64. This leverages native C++ encoding.
  - Wrap the asynchronous `FileReader` in a Promise to await it inside `page.evaluate`.

- **Pseudo-Code**:
  ```typescript
  // Inside page.evaluate (for both captureWebCodecs and finish)
  const context = (window as any).heliosWebCodecs;
  const chunks = context.chunks;

  if (chunks.length === 0) return '';

  // 1. Create Blob from chunks (Zero-copy or efficient copy depending on browser impl)
  const blob = new Blob(chunks, { type: 'application/octet-stream' });

  // 2. Clear buffer immediately
  context.chunks = [];

  // 3. Use FileReader to get Base64
  return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
          const result = reader.result as string;
          // result format: "data:application/octet-stream;base64,ABC..."
          // Split to get just the Base64 data
          const base64 = result.split(',')[1];
          resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read blob'));
      reader.readAsDataURL(blob);
  });
  ```

- **Public API Changes**: None. Internal implementation detail of `CanvasStrategy`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run build:examples && npx ts-node packages/renderer/scripts/render.ts`
- **Success Criteria**:
  - The render script completes with "Render finished successfully!".
  - The output video `output/canvas-animation.mp4` is created.
  - (Optional) Render time is equal to or faster than before.
- **Edge Cases**:
  - Empty chunks array (handled by `length === 0` check).
  - Very large blobs (browser might have limits, but `Blob` handles this better than string concatenation).
