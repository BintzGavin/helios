# Standardize Dynamic Props Animation Example

## 1. Context & Goal
- **Objective**: Modernize the `examples/dynamic-props-animation` example by converting it to TypeScript, adding a `package.json`, and standardizing the build configuration.
- **Trigger**: The current example uses `.jsx`, lacks `package.json`, and uses legacy build config patterns, which contradicts the goal of having standardized, testable examples.
- **Impact**: Ensures the example works correctly in the monorepo, is type-safe, and serves as a reference for using dynamic input props with Helios and React.

## 2. File Inventory
- **Create**:
    - `examples/dynamic-props-animation/package.json`
    - `examples/dynamic-props-animation/tsconfig.json`
    - `examples/dynamic-props-animation/vite.config.ts`
    - `examples/dynamic-props-animation/src/hooks/useVideoFrame.ts`
- **Modify**:
    - `examples/dynamic-props-animation/src/App.jsx` -> `examples/dynamic-props-animation/src/App.tsx` (Convert to TS, strict types)
    - `examples/dynamic-props-animation/src/main.jsx` -> `examples/dynamic-props-animation/src/main.tsx` (Convert to TS)
    - `examples/dynamic-props-animation/composition.html` (Update script source)
- **Delete**:
    - `examples/dynamic-props-animation/vite.config.js`
    - `examples/dynamic-props-animation/index.html`
    - `examples/dynamic-props-animation/src/hooks/useHelios.js`

## 3. Implementation Spec
- **Architecture**:
    - Use the standard `vite` build process with `@helios-project/core` alias.
    - Implement `useVideoFrame` hook to return the full `HeliosState` (including `inputProps`) to demonstrate dynamic property usage.
    - Define TypeScript interfaces for the input props schema.
    - Ensure `Helios` instance is initialized with the schema and default input props.
- **Dependencies**:
    - `react`, `react-dom`
    - `@helios-project/core` (local workspace dependency)
    - Dev: `typescript`, `vite`, `@vitejs/plugin-react`

## 4. Test Plan
- **Verification**:
    1. Run `npm install` in the root (to link dependencies).
    2. Run `npm run build` in `examples/dynamic-props-animation`.
    3. Run `npm run preview` in `examples/dynamic-props-animation` to manually check (optional).
    4. Run `npm run test` (if applicable) or verify via `tests/e2e/verify-render.ts` if I add it to the suite (but usually simply building is the first step).
- **Success Criteria**:
    - Build completes without errors.
    - Type check (`tsc`) passes.
    - The output `dist/` contains `composition.html` and assets.
