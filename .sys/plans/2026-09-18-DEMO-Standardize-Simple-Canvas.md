# Plan: Standardize Simple Canvas Example

## 1. Context & Goal
- **Objective**: Standardize `examples/simple-canvas-animation` to use TypeScript, `package.json`, and Vite, aligning it with modern example architecture.
- **Trigger**: The `simple-canvas-animation` example is a legacy "Vanilla" example using relative imports and inline scripts, creating a parity gap with standardized examples.
- **Impact**: Ensures the example is portable, verifiable via standard build commands, and demonstrates "Professional" usage as promised in the README.

## 2. File Inventory
- **Create**:
    - `examples/simple-canvas-animation/package.json`: Define dependencies and build scripts.
    - `examples/simple-canvas-animation/tsconfig.json`: TS configuration.
    - `examples/simple-canvas-animation/vite.config.js`: Vite configuration with alias.
    - `examples/simple-canvas-animation/src/main.ts`: Move logic here, converted to TS.
- **Modify**:
    - `examples/simple-canvas-animation/composition.html`: Update script tag to point to `./src/main.ts`.
    - `examples/simple-canvas-animation/index.html`: Update player import to point to `../../packages/player/dist/helios-player.js` (consistent with other standardized examples).
- **Read-Only**: `examples/threejs-canvas-animation/` (reference).

## 3. Implementation Spec
- **Architecture**:
    - Use `Vite` for bundling.
    - Use `TypeScript` for type safety.
    - Alias `@helios-project/core` to `../../packages/core/src/index.ts` in `vite.config.js` to run against source.
- **Pseudo-Code (`src/main.ts`)**:
    - Import `Helios` from `@helios-project/core`.
    - Get canvas element by ID.
    - Define `draw(frame)` function with canvas context logic.
    - Instantiate `Helios` with config.
    - `helios.subscribe` -> `draw`.
    - `helios.bindToDocumentTimeline()`.
- **Dependencies**:
    - Dev: `typescript`, `vite`.
    - Prod: `@helios-project/core` (file protocol).

## 4. Test Plan
- **Verification**:
    - Run `npm install` inside `examples/simple-canvas-animation`.
    - Run `npm run build` inside `examples/simple-canvas-animation`.
    - Verify `dist/` is created.
- **Success Criteria**: Build succeeds without errors.
- **Edge Cases**: Ensure `window.helios` is still exposed for debugging if needed.
