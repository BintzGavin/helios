# 2026-02-19-RENDERER-configurable-webcodecs-bitrate.md

#### 1. Context & Goal
- **Objective**: Synchronize the WebCodecs intermediate capture bitrate with `RendererOptions` to prevent quality bottlenecks.
- **Trigger**: The current `CanvasStrategy` hardcodes `VideoEncoder` bitrate to 5 Mbps (VP8), which degrades quality when the user requests high-bitrate output (e.g., 4K or high-quality H.264).
- **Impact**: Ensures "High-Performance" Canvas path delivers high-quality frames to FFmpeg, enabling professional-grade video export.

#### 2. File Inventory
- **Create**:
  - `packages/renderer/scripts/verify-bitrate.ts`: A script to verify that the bitrate configuration is correctly passed to the strategy.
- **Modify**:
  - `packages/renderer/src/strategies/CanvasStrategy.ts`: Update to accept `RendererOptions` and use dynamic bitrate.
  - `packages/renderer/src/index.ts`: Pass `RendererOptions` when instantiating `CanvasStrategy`.
- **Read-Only**:
  - `packages/renderer/src/types.ts`: To reference `RendererOptions` interface.

#### 3. Implementation Spec
- **Architecture**:
  - Inject `RendererOptions` into `CanvasStrategy` via constructor (Dependency Injection).
  - Implement a `parseBitrate(bitrateStr)` helper to convert strings like '5M', '5000k' to bits-per-second integers.
  - Determine `intermediateBitrate` logic:
    - If `options.videoBitrate` is set, parse it.
    - `intermediateBitrate = Math.max(25_000_000, parsedBitrate)`.
    - If `options.videoBitrate` is not set, default to 25 Mbps.
  - Pass this value to `encoderConfig` inside `page.evaluate`.
  - Add logging to confirm the configuration.
- **Pseudo-Code**:
  ```typescript
  // CanvasStrategy.ts
  class CanvasStrategy {
    constructor(private options: RendererOptions) {}

    private parseBitrate(bitrate: string): number {
      // Parse "5M" -> 5000000, "5000k" -> 5000000, etc.
      // Use regex or simple string manipulation to return bps
    }

    prepare(page) {
      targetBitrate = parseBitrate(options.videoBitrate) || 0
      // Ensure intermediate is high quality (at least 25Mbps) to avoid generation loss
      intermediateBitrate = Math.max(25_000_000, targetBitrate)

      console.log(`CanvasStrategy: Using WebCodecs (VP8) with bitrate: ${intermediateBitrate}`)

      page.evaluate((bitrate) => {
         const encoderConfig = {
           // ...
           bitrate: bitrate
         }
         // ...
      }, intermediateBitrate)
    }
  }
  ```

#### 4. Test Plan
- **Verification**:
  - Create `packages/renderer/scripts/verify-bitrate.ts` that:
    - Imports `Renderer`.
    - Instantiates `Renderer` with `videoBitrate: '50M'`.
    - Renders the `examples/simple-canvas-animation` (assumed built at `output/example-build/...`).
  - Execute: `npm run build:examples && npx ts-node packages/renderer/scripts/verify-bitrate.ts`.
- **Success Criteria**:
  - Console output contains: `CanvasStrategy: Using WebCodecs (VP8) with bitrate: 50000000`.
  - Render completes successfully.
- **Edge Cases**:
  - Also run `npx ts-node packages/renderer/scripts/render.ts` (default config) to ensure it defaults to 25000000.
