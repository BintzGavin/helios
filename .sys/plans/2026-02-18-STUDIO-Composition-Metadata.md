# Context & Goal
- **Objective**: Implement support for defining and persisting composition metadata (resolution, FPS, duration) during creation, and respecting these settings in the Studio UI.
- **Trigger**: Currently, creating a composition hardcodes settings (5s, 30fps) and assumes 1920x1080 resolution in Studio. Users must manually edit code and adjust Studio settings to match.
- **Impact**: This improves the "Quick Start" experience and ensures the Studio environment (Stage size) matches the composition's intended design automatically.

# File Inventory
- **Modify**:
  - `packages/studio/src/server/discovery.ts`: Update `createComposition` to accept options and write `composition.json`; update `findCompositions` to read it.
  - `packages/studio/src/server/templates/types.ts`: Update `Template` interface to accept options.
  - `packages/studio/src/server/templates/vanilla.ts`: Use options in code generation.
  - `packages/studio/src/server/templates/react.ts`: Use options in code generation.
  - `packages/studio/vite-plugin-studio-api.ts`: Pass options from API body to `createComposition`.
  - `packages/studio/src/context/StudioContext.tsx`: Update `Composition` interface and `createComposition` function; use metadata to set `canvasSize`.
  - `packages/studio/src/components/CreateCompositionModal.tsx`: Add inputs for Width, Height, FPS, Duration.

# Implementation Spec
- **Architecture**:
  - Store composition-specific settings in a `composition.json` file alongside `composition.html`.
  - Use this metadata to initialize the Studio Stage (`canvasSize`).
  - Use the settings during creation to generate the initial JS/TS code with the correct `Helios` constructor arguments.
- **Public API Changes**:
  - `POST /api/compositions` accepts optional `width`, `height`, `fps`, `duration`.
  - `GET /api/compositions` returns `metadata` object in the response items.
- **Pseudo-Code**:
  - **discovery.ts**:
    - `createComposition`: Accept `options`. Write `composition.json` with `{ width, height }`. Pass options to `template.generate`.
    - `findCompositions`: Check for `composition.json` in each folder. If exists, read and attach to `CompositionInfo`.
  - **templates**:
    - `generate(name, options)`: Inject `${options.fps || 30}` and `${options.duration || 60}` into the `new Helios(...)` call.
  - **StudioContext**:
    - When `activeComposition` updates, checks if `activeComposition.metadata` exists.
    - If so, call `setCanvasSize({ width, height })`.

# Test Plan
- **Verification**:
  - Run `npx helios studio`.
  - Open "Create Composition" modal.
  - Enter "Test Video", FPS: 60, Duration: 10, Width: 1080, Height: 1920.
  - Create.
  - Verify Studio loads the new composition.
  - Verify Stage size defaults to 1080x1920 (Portrait).
  - Verify Timeline shows 10s duration (implies FPS/Duration in code is correct).
- **Success Criteria**:
  - New composition is created with `composition.json`.
  - Studio automatically resizes Stage to match metadata.
  - Generated code contains the specified FPS and Duration.
