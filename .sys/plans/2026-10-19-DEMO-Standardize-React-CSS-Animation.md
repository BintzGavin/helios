# Context & Goal
- **Objective**: Standardize `examples/react-css-animation` to match the project's vision of professional, TypeScript-based examples.
- **Trigger**: The example currently uses legacy JavaScript (`.jsx`) and lacks a `package.json` and `tsconfig.json`, making it difficult for users to reuse and inconsistent with the project's "Professional" standard.
- **Impact**: Improves the "Use What You Know" promise by providing a copy-pasteable, fully typed example that works out of the box.

# File Inventory
- **Create**:
    - `examples/react-css-animation/package.json`: To define dependencies and scripts.
    - `examples/react-css-animation/tsconfig.json`: To define TypeScript configuration and path aliases.
    - `examples/react-css-animation/postcss.config.cjs`: To prevent root PostCSS config interference.
- **Modify**:
    - `examples/react-css-animation/vite.config.js`: Rename to `vite.config.ts` and update to TypeScript.
    - `examples/react-css-animation/src/main.jsx`: Rename to `src/main.tsx` and update imports.
    - `examples/react-css-animation/src/App.jsx`: Rename to `src/App.tsx` and update imports.
    - `examples/react-css-animation/composition.html`: Update script source to point to `.tsx` file.
- **Read-Only**:
    - `examples/react-dom-animation/package.json`: Reference for dependencies.
    - `examples/simple-canvas-animation/tsconfig.json`: Reference for TS config.

# Implementation Spec
- **Architecture**:
    - Convert the example to a standard Vite + TypeScript + React setup.
    - Use `@helios-project/core` path alias in `tsconfig.json` to reference the local package.
    - Add `package.json` with `dependencies` (React, Helios) and `devDependencies` (Vite, TS).
- **Pseudo-Code**:
    - `package.json`: Define `dev`, `build`, `preview` scripts. Add `react`, `react-dom`, `@helios-project/core` (file: protocol) dependencies.
    - `tsconfig.json`: Extend standard config, add paths for `@helios-project/*`.
    - `main.tsx`: Add type annotation for `window.helios` if needed, update import path to `@helios-project/core`.
    - `vite.config.ts`: Use `defineConfig`, add `react()` plugin, configure aliases for `@helios-project/*`.
- **Public API Changes**: None. This is an internal example update.
- **Dependencies**: None.

# Test Plan
- **Verification**:
    1.  Run `npm run build:examples` in the root directory to ensure the example is correctly picked up by the global build system.
    2.  Check for the existence of `output/example-build/examples/react-css-animation/composition.html`.
- **Success Criteria**:
    - Build completes without error.
    - The output file exists.
- **Edge Cases**:
    - Verify that `autoSyncAnimations: true` behavior is preserved (implicitly tested by existing E2E render verification, but explicitly checked by build success).
