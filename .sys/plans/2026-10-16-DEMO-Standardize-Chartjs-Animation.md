# 2026-10-16-DEMO-Standardize-Chartjs-Animation.md

## 1. Context & Goal
- **Objective**: Standardize `examples/chartjs-animation` by adding `package.json`, `vite.config.ts`, `tsconfig.json`, and proper TypeScript configuration.
- **Trigger**: The project vision requires all examples to be self-contained, strictly typed, and built with Vite/TypeScript, but `examples/chartjs-animation` is currently a legacy example without build config.
- **Impact**: Enables `npm install` and `npm run build` within the example directory, ensures strict type safety, and aligns with the "Professional" example standard.

## 2. File Inventory
- **Create**:
    - `examples/chartjs-animation/package.json`: To manage dependencies and scripts.
    - `examples/chartjs-animation/vite.config.ts`: To configure Vite for building and serving.
    - `examples/chartjs-animation/tsconfig.json`: To enforce strict TypeScript settings.
    - `examples/chartjs-animation/postcss.config.cjs`: To isolate Tailwind/PostCSS config.
- **Modify**:
    - `examples/chartjs-animation/src/main.ts`: Update import paths to use `@helios-project/core` alias instead of relative paths.
- **Read-Only**:
    - `packages/core`: Referenced via alias.

## 3. Implementation Spec
- **Architecture**:
    - Use Vite for bundling (`type: "module"`).
    - Use TypeScript for strict type checking.
    - Reference local `@helios-project/core` via `file:` protocol in `package.json` and path alias in `vite.config.ts`/`tsconfig.json`.
- **Dependencies**:
    - `chart.js` (Dependency)
    - `@helios-project/core` (Dependency, file:../../packages/core)
    - `typescript`, `vite`, `@types/node` (DevDependencies)
- **Configuration Details**:
    - `package.json`: Scripts for `dev`, `build`, `preview`.
    - `vite.config.ts`: Alias `@helios-project/core` to `../../packages/core/src/index.ts`. Allow serving from project root.
    - `tsconfig.json`: Strict mode, `moduleResolution: bundler`.
    - `postcss.config.cjs`: `module.exports = {};` to prevent root config interference.

## 4. Test Plan
- **Verification**:
    1. `cd examples/chartjs-animation`
    2. `npm install`
    3. `npm run build`
    4. Verify `dist/` directory is created.
    5. Verify `src/main.ts` compiles without type errors.
- **Success Criteria**:
    - Build completes successfully.
    - No type errors in `src/main.ts`.
    - Imports use `@helios-project/core`.
- **Edge Cases**:
    - Ensure `chart.js` types are resolved correctly (included in `chart.js` package).
