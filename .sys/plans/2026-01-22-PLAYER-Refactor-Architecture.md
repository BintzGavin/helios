# Context & Goal
- **Objective**: Refactor `<helios-player>` to separate UI, Controller, and Export logic into distinct modules, and introduce `export-mode` and `canvas-selector` attributes for robust export control.
- **Trigger**: The `index.ts` file has become a "God Class" (430+ lines), coupling UI rendering with complex video encoding logic. This violates the Single Responsibility Principle and makes the "Client-Side Export" brittle (e.g., hardcoded to the first canvas).
- **Impact**: This architectural cleanup unlocks "Robust Client-Side Export" by allowing precise targeting of export elements (Vision Gap), improves testability, and prepares the codebase for future features (e.g., advanced DOM rendering) without cluttering the UI component.

# File Inventory
- **Create**: `packages/player/src/controllers.ts`
  - Purpose: Host `HeliosController` interface, `DirectController`, and `BridgeController` classes.
- **Create**: `packages/player/src/features/exporter.ts`
  - Purpose: Host `ClientSideExporter` class, encapsulating `VideoEncoder` and `mp4-muxer` logic.
- **Modify**: `packages/player/src/index.ts`
  - Purpose: Remove extracted logic; implement `export-mode` and `canvas-selector` attributes; wire up the new `ClientSideExporter`.
- **Read-Only**: `packages/player/src/bridge.ts`
  - Purpose: Reference for existing iframe-side bridge logic (do not modify).

# Implementation Spec

### 1. Controllers (`packages/player/src/controllers.ts`)
- **Move**: Extract `HeliosController` interface, `DirectController`, and `BridgeController` from `index.ts`.
- **Adjust**: Ensure `BridgeController` still accepts `window` (or `MessageEventSource`) for communication.

### 2. Exporter (`packages/player/src/features/exporter.ts`)
- **Class**: `ClientSideExporter`
- **Method**: `exportVideo(controller: HeliosController, iframe: HTMLIFrameElement, options: ExportOptions): Promise<void>`
- **Types**:
  ```typescript
  export type ExportMode = 'auto' | 'canvas' | 'dom';
  export interface ExportOptions {
    mode: ExportMode;
    canvasSelector: string; // default "canvas"
    onProgress: (progress: number) => void;
  }
  ```
- **Logic**:
  - **Auto**: Try finding element by `canvasSelector`. If it's a `<canvas>`, use Canvas path. Else fallback to DOM path.
  - **Canvas**: Find element by `canvasSelector`. If not `<canvas>`, throw error. Use WebCodecs path.
  - **DOM**: Use DOM-to-Canvas path (existing primitive implementation).
- **Dependencies**: Move `mp4-muxer` import here.

### 3. Player Component (`packages/player/src/index.ts`)
- **Attributes**:
  - `export-mode`: Parses to `ExportMode` (default 'auto').
  - `canvas-selector`: String (default 'canvas').
- **Integration**:
  - Instantiate `ClientSideExporter` (or use static method).
  - In `renderClientSide`, call `exporter.exportVideo(...)` passing the current controller and options.
  - Pass a callback for progress updates to update the button text.

# Test Plan
- **Verification**: `npm run build -w packages/player`
- **Success Criteria**:
  - Build completes with no TypeScript errors.
  - `dist/` contains the new modules (or bundles them correctly).
  - Logic is physically separated into the 3 files.
- **Edge Cases**:
  - `canvas-selector` not finding an element (should handle gracefully or throw clear error).
  - `export-mode="canvas"` when no canvas exists (should error).
