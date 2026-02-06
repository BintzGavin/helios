# 📋 Standardize Variable Font Animation Example

#### 1. Context & Goal
- **Objective**: Standardize `examples/variable-font-animation` to match modern project standards (TypeScript, `package.json`, proper build config).
- **Trigger**: The example currently uses raw JavaScript, lacks a `package.json`, and uses fragile relative imports, making it inconsistent with the "Use What You Know" vision and harder to maintain.
- **Impact**: Ensures the example is buildable via the standard pipeline, improves maintainability through TypeScript, and serves as a better reference for users.

#### 2. File Inventory
- **Create**:
  - `examples/variable-font-animation/package.json`: To define dependencies and scripts.
  - `examples/variable-font-animation/tsconfig.json`: To configure TypeScript.
  - `examples/variable-font-animation/vite.config.ts`: To configure Vite with React plugin and alias.
  - `examples/variable-font-animation/import-player.js`: Helper to import the player in `index.html`.
- **Modify**:
  - `examples/variable-font-animation/src/main.jsx` -> `examples/variable-font-animation/src/main.tsx`: Convert to TypeScript and update imports.
  - `examples/variable-font-animation/src/App.jsx` -> `examples/variable-font-animation/src/App.tsx`: Convert to TypeScript.
  - `examples/variable-font-animation/composition.html`: Update script source to point to `.tsx`.
  - `examples/variable-font-animation/index.html`: Update to use `<helios-player>` harness for development preview.
- **Delete**:
  - `examples/variable-font-animation/vite.config.js`: Replaced by the TypeScript version.

#### 3. Implementation Spec
- **Architecture**:
  - Use **Vite** as the bundler.
  - Use **TypeScript** for type safety.
  - Use `file:../../packages/core` in `package.json` to link to the local core package.
  - Use a **Vite Alias** in `vite.config.ts` to map `@helios-project/core` to `../../packages/core/src/index.ts` for source-level debugging during development.
- **Pseudo-Code**:
  - **package.json**:
    - Name: `variable-font-animation`
    - Dependencies: `@helios-project/core`, `react`, `react-dom`
    - DevDependencies: `vite`, `@vitejs/plugin-react`, `typescript`, types
  - **vite.config.ts**:
    - Configure `resolve.alias` to map `@helios-project/core` to the source file.
    - Add `react()` plugin.
    - Enable `server.fs.allow` for workspace root.
  - **main.tsx**:
    - Import `Helios` from `@helios-project/core` (not relative path).
    - Initialize `Helios` with `autoSyncAnimations: true`.
    - Bind to document timeline.
  - **App.tsx**:
    - Add type annotations if necessary (though likely minimal for this simple component).
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm install` inside `examples/variable-font-animation`.
  - Run `npm run build` inside `examples/variable-font-animation`.
- **Success Criteria**:
  - The build command completes without error.
  - A `dist/` directory is created.
  - `composition.html` in `dist/` correctly references the built assets.
- **Edge Cases**:
  - Ensure the relative path in `package.json` works correctly in the monorepo structure.
