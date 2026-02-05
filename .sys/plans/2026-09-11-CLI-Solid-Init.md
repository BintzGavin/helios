# 📋 CLI: Add SolidJS Support to Init Command

## 1. Context & Goal
- **Objective**: Add SolidJS as a supported framework in `helios init` to scaffold new projects.
- **Trigger**: Vision gap - `examples/solid-dom-animation` exists and is part of the ecosystem, but the CLI lacks a template to scaffold it, forcing manual setup.
- **Impact**: Enables SolidJS developers to easily bootstrap Helios projects, aligning the CLI ("primary interface") with the ecosystem capabilities demonstrated in Examples.

## 2. File Inventory
- **Create**:
  - `packages/cli/src/templates/solid.ts`: Will contain the file templates for a SolidJS project (package.json, vite.config.ts, src/index.tsx, src/App.tsx, etc.)
- **Modify**:
  - `packages/cli/src/commands/init.ts`: Update `Framework` type, `TEMPLATES` map, and prompts to include 'solid'.
- **Read-Only**:
  - `packages/cli/src/templates/react.ts` (Reference for structure)

## 3. Implementation Spec
- **Architecture**:
  - Define `SOLID_TEMPLATE` constant following existing patterns (e.g., `REACT_TEMPLATE`).
  - The template will include:
    - `package.json`: Dependencies `solid-js` (^1.8.0), `vite-plugin-solid` (^2.8.0).
    - `vite.config.ts`: Configured with `solidPlugin()`.
    - `tsconfig.json`: `jsx: "preserve"`, `jsxImportSource: "solid-js"`.
    - `src/index.tsx`: Entry point initializing `Helios` and mounting the app.
    - `src/App.tsx`: A basic component demonstrating Helios integration (using `createHeliosSignal` pattern or similar).
    - `src/vite-env.d.ts`: Standard Vite types.
- **Pseudo-Code**:
  - In `packages/cli/src/templates/solid.ts`:
    - Export `SOLID_TEMPLATE` object mapping filenames to content strings.
  - In `packages/cli/src/commands/init.ts`:
    - Import `SOLID_TEMPLATE`.
    - Add `'solid'` to `Framework` type union.
    - Add `solid: SOLID_TEMPLATE` to `TEMPLATES` object.
    - Update `ask` prompt to list `solid` as an option.
- **Public API Changes**:
  - `helios init` will accept 'solid' as an option in the interactive prompt.
  - `helios init --yes` remains default (React).
- **Dependencies**:
  - No new package dependencies for the CLI itself.
  - The scaffolded project will depend on `solid-js` and `vite-plugin-solid`.

## 4. Test Plan
- **Verification**:
  - Run `helios init` in a clean directory, select 'solid'.
  - Verify `package.json` contains `solid-js`.
  - Verify `vite.config.ts` uses `vite-plugin-solid`.
  - Verify `src/App.tsx` and `src/index.tsx` are created.
- **Success Criteria**:
  - `helios init` successfully scaffolds a SolidJS project structure without errors.
- **Edge Cases**:
  - Verify that choosing 'solid' correctly overrides the default 'react'.
