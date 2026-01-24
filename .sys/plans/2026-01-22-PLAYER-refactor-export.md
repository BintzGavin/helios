# Plan: Refactor Player & Harden Client-Side Export

## 1. Context & Goal
- **Objective**: Decompose the monolithic `HeliosPlayer` class into modular components and harden the Client-Side Export feature.
- **Trigger**: Vision Gaps in architectural quality (monolithic file) and robustness (missing `mp4-muxer` video config, fragile single-canvas assumption).
- **Impact**: Improves maintainability of `packages/player`, ensures valid MP4 generation, and adds user-facing "Cancel" capability.

## 2. File Inventory
- **Create**:
  - `packages/player/src/controllers.ts`: To house `HeliosController`, `DirectController`, `BridgeController`.
  - `packages/player/src/features/exporter.ts`: To house `ClientSideExporter` logic.
- **Modify**:
  - `packages/player/src/index.ts`: Remove extracted logic, import new modules, implement "Cancel" UI.
- **Read-Only**:
  - `packages/player/src/bridge.ts`

## 3. Implementation Spec
- **Architecture**:
  - **Strategy Pattern** for Controllers (already exists, moving to dedicated file).
  - **Feature Module** for Export (`ClientSideExporter` class) to encapsulate complex `VideoEncoder`/`Muxer` logic.
- **Pseudo-Code**:
  - `ClientSideExporter` class:
    - Constructor takes `HeliosController` and `HTMLIFrameElement`.
    - `export(onProgress, signal)` method:
      - Checks `signal.aborted`.
      - Locates canvas (validates dimensions > 0).
      - Initializes `Muxer` with `video` options (`codec: 'avc'`, `width`, `height`).
        - *Note*: Use `mp4-muxer` v2.x API (no `fastStart` option supported).
      - Configures `VideoEncoder`.
      - Loops through frames:
        - Checks `signal.aborted`.
        - Seeks controller.
        - Waits for frame.
        - Encodes.
      - Finalizes and downloads.
  - `HeliosPlayer` class:
    - Adds `abortController` state.
    - `renderClientSide` checks `isExporting` flag.
    - If exporting, calls `abort()`.
    - If not, starts export with `AbortSignal`.
    - Updates UI button text to "Cancel" during export.
- **Public API Changes**: None.
- **Dependencies**: None (uses existing `mp4-muxer`).

## 4. Test Plan
- **Verification**:
  - Run `npm run build -w packages/player` to verify TypeScript compilation.
  - (Manual): Verify `packages/player/dist/index.js` is generated.
- **Success Criteria**: Build succeeds. Code is split.
- **Edge Cases**:
  - User cancels export -> Export stops, UI resets.
  - Canvas missing or empty -> Throws error, UI resets.
