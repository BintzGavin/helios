# CORE: Fix Build Failure & Exclude Tests

#### 1. Context & Goal
- **Objective**: Fix the `packages/core` build failure and prevent test files from being included in the distribution.
- **Trigger**: The `npm run build` command for `packages/core` fails because `src/subscription-timing.test.ts` uses the Node-specific `global` variable, which causes type errors in the isomorphic TypeScript configuration.
- **Impact**: Unblocks the build pipeline (critical for release) and ensures the published `@helios-project/core` package does not contain unnecessary test artifacts in `dist/`.

#### 2. File Inventory
- **Modify**: `packages/core/src/subscription-timing.test.ts`
  - Replace `(global as any)` with `(globalThis as any)` to fix the type error and align with standard isomorphic practices.
- **Modify**: `packages/core/tsconfig.json`
  - Add `"exclude": ["src/**/*.test.ts"]` to prevent `tsc` from compiling test files into the output directory.

#### 3. Implementation Spec
- **Architecture**: Configuration update. No architectural changes to the runtime.
- **Pseudo-Code**:
  - In `subscription-timing.test.ts`:
    - Change `originalWindow = (global as any).window` to `originalWindow = (globalThis as any).window`
    - Apply same change for `document` and restoration logic.
  - In `tsconfig.json`:
    - Add `"exclude": ["src/**/*.test.ts"]` at the root level (merging with existing config).
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1. Run `npm run build -w packages/core`
  2. Run `ls packages/core/dist`
  3. Run `npm test -w packages/core`
- **Success Criteria**:
  - Build command completes with exit code 0.
  - `packages/core/dist` does NOT contain `index.test.js`, `subscription-timing.test.js`, or any other `*.test.js` files.
  - Tests pass (proving the `globalThis` change didn't break the mock).
- **Edge Cases**:
  - Ensure `subscription-timing.test.ts` still correctly mocks `window` and `document` in the Node environment (vitest defaults to Node-like environment unless configured otherwise). `globalThis` is available in Node 12+, so this is safe.
