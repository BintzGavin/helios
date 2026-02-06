# 2026-09-27-DEMO-Standardize-WAAPI-Example.md

## 1. Context & Goal
- **Objective**: Standardize the legacy `examples/waapi-animation` example to match the modern "Professional" project structure (Vite + TypeScript + package.json).
- **Trigger**: The file listing shows `examples/waapi-animation` lacks `package.json` and TypeScript config, identifying it as a legacy example that needs standardization (matching the pattern of `gsap-animation`).
- **Impact**: Ensures the WAAPI example is self-contained, "ejectable", and uses the standard build pipeline, improving developer experience and consistency.

## 2. File Inventory
- **Create**:
  - `examples/waapi-animation/package.json`: Define dependencies and scripts.
  - `examples/waapi-animation/tsconfig.json`: TypeScript configuration.
  - `examples/waapi-animation/vite.config.ts`: Vite configuration with core aliases.
  - `examples/waapi-animation/postcss.config.cjs`: Empty config for Vite compatibility.
  - `examples/waapi-animation/src/main.ts`: New entry point for logic.
- **Delete**:
  - `examples/waapi-animation/index.html`: Remove the legacy player wrapper to match the standardized pattern.
- **Modify**:
  - `examples/waapi-animation/composition.html`: Remove inline scripts and point to `src/main.ts`.
- **Read-Only**:
  - `examples/gsap-animation/`: Reference for structure.
  - `vite.build-example.config.js`: Root build config.

## 3. Implementation Spec
- **Architecture**: Move from a single HTML file with inline scripts/styles to a Vite+TypeScript setup. Use `src/main.ts` as the logic entry point.
- **Pseudo-Code**:
  - **`package.json`**: Define name, version, type: module, scripts (dev, build, preview), and dependencies (`@helios-project/core`).
  - **`vite.config.ts`**: Configure alias for `@helios-project/core` pointing to `../../packages/core/src/index.ts` and set root/base correctly.
  - **`src/main.ts`**:
    - Import `Helios` from `@helios-project/core`.
    - Select elements from DOM.
    - Define WAAPI animation (`element.animate(...)`).
    - Instantiate `Helios` with `autoSyncAnimations: true`.
    - Bind to document timeline (`helios.bindToDocumentTimeline()` - present in original `composition.html`).
    - Expose `window.helios` for debugging.
  - **`composition.html`**:
    - Keep HTML structure (elements).
    - Add `<script type="module" src="./src/main.ts"></script>`.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1.  Run `npm run build:examples` from the project root to ensure it builds via the root pipeline (confirmed in root `package.json`).
  2.  Run `npx tsx tests/e2e/verify-render.ts waapi-animation` to verify the rendering output (duration, content).
- **Success Criteria**:
  - Build succeeds.
  - Verification script passes (Output video duration ~4s, non-black frames).
- **Edge Cases**:
  - Verify that `autoSyncAnimations: true` still correctly finds the animation when instantiated from a module.
