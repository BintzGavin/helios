# Plan: Standardize WAAPI Animation Example

## 1. Context & Goal
- **Objective**: Standardize the legacy `examples/waapi-animation` example to match the modern "Professional" project structure (Vite + TypeScript + package.json).
- **Trigger**: Vision gap - "Native Always Wins". The WAAPI example is a core demonstration of Helios's philosophy but currently exists as a legacy folder without proper build config. A previous plan (`2026-09-27`) addressed this but was not executed.
- **Impact**: Ensures the WAAPI example is self-contained, "ejectable", and uses the standard build pipeline, improving developer experience and consistency.

## 2. File Inventory
- **Create**:
  - `examples/waapi-animation/package.json`: Define dependencies and scripts.
  - `examples/waapi-animation/tsconfig.json`: TypeScript configuration.
  - `examples/waapi-animation/vite.config.ts`: Vite configuration with core aliases.
  - `examples/waapi-animation/postcss.config.cjs`: Empty config for Vite compatibility.
  - `examples/waapi-animation/src/main.ts`: New entry point for logic.
  - `examples/waapi-animation/import-player.js`: Entry point for the player wrapper.
- **Modify**:
  - `examples/waapi-animation/composition.html`: Remove inline scripts and point to `src/main.ts`.
  - `examples/waapi-animation/index.html`: Update script source to use `import-player.js`.
- **Read-Only**:
  - `examples/simple-animation/`: Reference for structure.
  - `vite.build-example.config.js`: Root build config.

## 3. Implementation Spec
- **Architecture**: Move from a single HTML file with inline scripts/styles to a Vite+TypeScript setup. Use `src/main.ts` as the logic entry point.
- **Pseudo-Code**:
  - **`package.json`**: Define name (`waapi-animation`), version, type: module, scripts (dev, build, preview), and dependencies (`@helios-project/core`, `vite`, `typescript`). Copy structure from `simple-animation`.
  - **`vite.config.ts`**: Configure alias for `@helios-project/core` pointing to `../../packages/core/src/index.ts` and set root/base correctly. Set `server.fs.allow` to support monorepo root access.
  - **`src/main.ts`**:
    - Import `Helios` from `@helios-project/core`.
    - Select elements from DOM (ensure `.box` exists).
    - Define WAAPI animation (`element.animate(...)`).
    - Instantiate `Helios` with `autoSyncAnimations: true`.
    - Bind to document timeline (`helios.bindToDocumentTimeline()`).
    - Expose `window.helios` for debugging.
  - **`composition.html`**:
    - Keep HTML structure (elements).
    - Add `<script type="module" src="./src/main.ts"></script>`.
  - **`import-player.js`**:
    - `import '@helios-project/player';`
  - **`index.html`**:
    - Change `<script src="../../...">` to `<script type="module" src="./import-player.js">`.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1.  Run `npm install` to link the new package (if using workspaces) or just rely on root install.
  2.  Run `npm run build:examples` from the project root to ensure it builds via the root pipeline.
  3.  Run `npx tsx tests/e2e/verify-render.ts waapi-animation` to verify the rendering output (duration, content).
- **Success Criteria**:
  - Build succeeds.
  - Verification script passes (Output video duration ~4s, non-black frames).
- **Edge Cases**:
  - Verify that `autoSyncAnimations: true` still correctly finds the animation when instantiated from a module.
