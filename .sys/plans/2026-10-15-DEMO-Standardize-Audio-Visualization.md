# 2026-10-15-DEMO-Standardize-Audio-Visualization.md

#### 1. Context & Goal
- **Objective**: Standardize the legacy `examples/audio-visualization` to use TypeScript, a dedicated `package.json`, and a self-contained Vite build configuration.
- **Trigger**: The example currently lacks `package.json`, uses inline JavaScript in `composition.html`, and relies on legacy build assumptions, violating the "Standardized Examples" vision.
- **Impact**: Ensures the example is portable, type-safe, and consistent with the rest of the examples suite.

#### 2. File Inventory
- **Create**:
  - `examples/audio-visualization/package.json`: To define dependencies and scripts.
  - `examples/audio-visualization/tsconfig.json`: To configure TypeScript.
  - `examples/audio-visualization/vite.config.ts`: To configure Vite with proper aliases.
  - `examples/audio-visualization/src/main.ts`: To house the logic currently in `composition.html`.
- **Modify**:
  - `examples/audio-visualization/composition.html`: To remove inline script and point to `src/main.ts`.
- **Delete**:
  - `examples/audio-visualization/vite.config.js`: Replaced by the TypeScript version.
- **Read-Only**:
  - `examples/simple-canvas-animation/package.json`: Reference for dependencies.
  - `examples/simple-canvas-animation/vite.config.ts`: Reference for config.

#### 3. Implementation Spec
- **Architecture**:
  - Convert "Vanilla JS" logic to "Vanilla TypeScript".
  - Use `file:../../packages/core` protocol for local development.
  - Configure Vite to allow serving from the workspace root (required for local package linking).
- **Pseudo-Code**:
  - **package.json**:
    - Name: `@helios-examples/audio-visualization`
    - Scripts: `dev`, `build` (tsc + vite build), `preview`.
    - Dependencies: `@helios-project/core`.
    - DevDependencies: `typescript`, `vite`, `@types/node`.
  - **src/main.ts**:
    - Move all logic from the `<script>` tag in `composition.html`.
    - Add types for `AudioContext`, `CanvasRenderingContext2D`, etc.
    - Ensure `Helios` is imported from `@helios-project/core`.
  - **composition.html**:
    - Replace `<script>` with `<script type="module" src="/src/main.ts"></script>`.

#### 4. Test Plan
- **Verification**:
  - Run `npm install` within `examples/audio-visualization`.
  - Run `npm run build` within `examples/audio-visualization` to verify TS compilation and Vite build.
  - Run `npm run build:examples` in the root to ensure it doesn't break the global build.
- **Success Criteria**:
  - `dist/` directory is generated in `examples/audio-visualization`.
  - `dist/index.html` contains the bundled script.
- **Edge Cases**:
  - Ensure `vite.config.ts` correctly resolves the local `@helios-project/core` package.
