# 📋 Spec: Create Renderer README

## 1. Context & Goal
- **Objective**: Create a comprehensive `README.md` for `packages/renderer`.
- **Trigger**: The package currently lacks documentation, which is a critical "Vision Gap" for the Renderer Planner role.
- **Impact**: Establishes the architectural vision, documents features, and provides usage instructions for developers and agents.

## 2. File Inventory
- **Create**: `packages/renderer/README.md` (New documentation file)
- **Modify**: None
- **Read-Only**: `packages/renderer/src/index.ts`, `packages/renderer/src/types.ts` (For reference)

## 3. Implementation Spec
- **Architecture**:
  - The README will serve as the "Contract" for the package.
  - It will document the "Dual-Path Architecture" (Canvas/DOM).
  - It will document the "No Disk I/O" pipeline.
- **Content Outline**:
  1.  **Title**: `@helios-project/renderer`
  2.  **Introduction**: High-performance Node.js rendering engine.
  3.  **Key Features**:
      -   **Dual-Path Rendering**:
          -   `CanvasStrategy`: Uses WebCodecs (Hardware Accelerated) or `toDataURL` fallback.
          -   `DomStrategy`: Uses Playwright Screenshots for HTML/CSS animations.
      -   **Zero Disk I/O**: Direct pipe to FFmpeg.
      -   **Smart Codec Selection**: H.264/Copy vs VP8/IVF.
      -   **Audio Mixing**: Robust `amix`/`adelay` pipeline.
  4.  **Installation**: `npm install ...`
  5.  **Usage**:
      -   Import `Renderer`.
      -   Initialize with options.
      -   Call `render(url, output)`.
  6.  **Configuration**:
      -   Table of `RendererOptions` (width, height, fps, mode, audio, codecs).
  7.  **Architecture**:
      -   Briefly explain `RenderStrategy` and `TimeDriver` concepts.

## 4. Test Plan
- **Verification**:
  -   Manual inspection of the generated markdown.
  -   Ensure all sections are present and accurate to the code.
- **Success Criteria**:
  -   `packages/renderer/README.md` exists.
  -   It accurately reflects the current codebase capabilities (e.g. WebCodecs support).
