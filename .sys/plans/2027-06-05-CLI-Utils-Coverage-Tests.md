#### 1. Context & Goal
- **Objective**: Implement missing unit tests to achieve 100% test coverage for `packages/cli/src/utils/`.
- **Trigger**: Coverage metrics (`npx vitest run --coverage src/utils/__tests__`) indicate uncovered branches in `install.ts`, `package-manager.ts`, `uninstall.ts`, and `examples.ts`.
- **Impact**: Ensures reliability of CLI core utilities for dependency installation, file management, and example template transformation.

#### 2. File Inventory
- **Modify**:
  - `packages/cli/src/utils/__tests__/install.test.ts`
  - `packages/cli/src/utils/__tests__/package-manager.test.ts`
  - `packages/cli/src/utils/__tests__/uninstall.test.ts`
  - `packages/cli/src/utils/__tests__/examples.test.ts`
- **Read-Only**:
  - `packages/cli/src/utils/install.ts`
  - `packages/cli/src/utils/package-manager.ts`
  - `packages/cli/src/utils/uninstall.ts`
  - `packages/cli/src/utils/examples.ts`

#### 3. Implementation Spec
- **Architecture**: Extend the existing Vitest `describe` blocks in the respective utility test files to trigger edge cases handling file system operations and spawned processes.
- **Pseudo-Code**:
  - **`install.test.ts`**: Add test for line 132 (simulate dependency installation failure via `package-manager.ts` mock) and line 141 (initialize `config.components` when it is undefined).
  - **`package-manager.test.ts`**: Add tests for lines 35, 39, and 43 to execute the `--dev` flag branches for yarn, pnpm, and bun by calling `installPackage` with `isDev = true`.
  - **`uninstall.test.ts`**: Add test for lines 50-54 simulating empty directory cleanup where `fs.rmdirSync` is executed up the tree, and the termination condition `fs.readdirSync().length > 0` breaks the loop.
  - **`examples.test.ts`**: Add tests for file write failures (`fs.writeFileSync` throws) in `transformExampleRepo` to cover the catch blocks at lines 83 (`package.json`), 119 (`vite.config.ts`), and 140 (`tsconfig.json`). Add a test for line 147 validating creation of `postcss.config.cjs` when it does not exist.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `cd packages/cli && npx vitest run --coverage src/utils/__tests__`.
- **Success Criteria**: 100% Branch, Statement, and Line coverage for `install.ts`, `package-manager.ts`, `uninstall.ts`, and `examples.ts` reported by Vitest.
