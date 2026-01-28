# 2026-01-28-CORE-ESM-Compliance.md

#### 1. Context & Goal
- **Objective**: Convert `@helios-project/core` to a fully compliant native ESM package.
- **Trigger**: The Vision states "Runs in Node.js", but the current codebase emits ESM syntax in `.js` files without `"type": "module"` or explicit file extensions, causing failures in native Node.js environments.
- **Impact**: Unlocks usage in vanilla Node.js environments (server-side rendering) without relying on bundlers or `tsx/ts-node`. Aligns with `packages/renderer` patterns.

#### 2. File Inventory
- **Modify**: `packages/core/package.json` (Add `"type": "module"`)
- **Modify**: `packages/core/tsconfig.json` (Update `moduleResolution`)
- **Modify**: `packages/core/src/**/*.ts` (Add `.js` extensions to all relative imports)
- **Modify**: `packages/core/src/**/*.test.ts` (Add `.js` extensions to imports)

#### 3. Implementation Spec
- **Architecture**: Adopting standard Node.js ESM (ECMAScript Modules).
- **Configuration**:
  - `package.json`: Set `"type": "module"`.
  - `tsconfig.json`: Set `"moduleResolution": "node16"`. This enforces that imports use explicit file extensions, matching Node.js ESM requirements.
- **Code Refactoring**:
  - Update all `import ... from './file'` to `import ... from './file.js'`.
  - Update all `export ... from './file'` to `export ... from './file.js'`.
  - Resolve directory imports: Change `from './drivers'` to `from './drivers/index.js'`.
  - Apply this to all files in `packages/core/src/`.

#### 4. Test Plan
- **Verification**:
  1. `npm run build -w packages/core` (TSC should succeed).
  2. `npm test -w packages/core` (Vitest should succeed).
  3. Create a temporary `test-esm.mjs` file in the root or `packages/core` that imports from `./dist/index.js` and instantiates `Helios`. Run it with `node test-esm.mjs`.
- **Success Criteria**: Build passes, tests pass, and native Node.js script executes without `ERR_MODULE_NOT_FOUND` or `SyntaxError`.
- **Edge Cases**: Ensure `vitest` configuration works with ESM (it generally does, but might need `vite.config.ts` tweaks if it relies on CJS resolution).
