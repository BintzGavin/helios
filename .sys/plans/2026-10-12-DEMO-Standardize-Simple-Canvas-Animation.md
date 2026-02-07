# 2026-10-12-DEMO-Standardize-Simple-Canvas-Animation.md

#### 1. Context & Goal
- **Objective**: Standardize the legacy `examples/simple-canvas-animation` to use the modern Vite+TypeScript pipeline.
- **Trigger**: "Vision Gap" - The example currently uses raw HTML/JS with relative imports, lacking `package.json` and build config, which violates the "Professional" standard.
- **Impact**: Ensures the example is self-contained, buildable, and serves as a proper reference for users. It also aligns with the repository's goal of standardizing all examples.

#### 2. File Inventory
- **Create**:
  - `examples/simple-canvas-animation/package.json`: To define dependencies and scripts.
  - `examples/simple-canvas-animation/tsconfig.json`: To configure TypeScript.
  - `examples/simple-canvas-animation/vite.config.ts`: To configure Vite with alias support for local development.
  - `examples/simple-canvas-animation/src/main.ts`: To house the logic extracted from `composition.html`.
- **Modify**:
  - `examples/simple-canvas-animation/composition.html`: To import `src/main.ts` instead of inline script.
  - `examples/simple-canvas-animation/index.html`: To ensure compatibility with the new structure.
- **Read-Only**:
  - `examples/simple-animation/vite.config.ts`: Reference for config.
  - `packages/core/src/index.ts`: Reference for import.

#### 3. Implementation Spec
- **Architecture**:
  - Convert from "Inline Script" to "Module-based" architecture.
  - Use `vite` for development and building.
  - Use `typescript` for type safety (even if source is simple).
  - Use `package.json` to manage dependencies (`@helios-project/core`).
- **Pseudo-Code**:
  - `package.json`: Define `name`, `private: true`, `type: module`, scripts (`dev`, `build`, `preview`), and devDependencies (`vite`, `typescript`). Dependency: `@helios-project/core: file:../../packages/core`.
  - `vite.config.ts`: Configure `resolve.alias` to map `@helios-project/core` to the local source and `@helios-project/player` to local source. Set `build.rollupOptions.input` to `composition.html`. Allow `fs` access to `../..`.
  - `src/main.ts`:
    - Import `Helios` from `@helios-project/core`.
    - Implement the canvas drawing logic (move from `composition.html`).
    - Ensure `canvas` element is selected correctly.
    - Expose `window.helios`.
  - `composition.html`:
    - Remove inline script.
    - Add `<script type="module" src="/src/main.ts"></script>`.
  - `index.html`:
    - Update script source to verify player integration works with the new vite config.
  - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm install` in `examples/simple-canvas-animation`.
  - Run `npm run build` in `examples/simple-canvas-animation`.
  - Verify `dist/composition.html` exists and contains the built script.
  - Run `npx vite preview` (or `npm run preview`) and verify the animation plays in the browser.
- **Success Criteria**:
  - Build succeeds without errors.
  - The animation renders correctly and matches the logic extracted from `composition.html`.
- **Edge Cases**:
  - Ensure `window.helios` is still exposed for debugging if it was before.
