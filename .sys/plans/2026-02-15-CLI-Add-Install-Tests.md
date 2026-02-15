# Context & Goal
- **Objective**: Add comprehensive unit tests for the CLI's `installComponent` utility and configuration management (`config.ts`) to ensure stability of critical `add` and `init` commands.
- **Trigger**: The CLI is a "First-Class Product Surface" but currently lacks automated tests for its core logic, relying on manual verification (Gap: "Testability is mandatory").
- **Impact**: Prevents regressions in component installation (especially recursive dependencies) and configuration parsing, enabling safer refactoring and feature expansion.

# File Inventory
- **Modify**: `packages/cli/src/utils/install.ts` (Export `resolveComponentTree` for testing purposes).
- **Create**: `packages/cli/src/utils/__tests__/config.test.ts` (Unit tests for `loadConfig`, `saveConfig`).
- **Create**: `packages/cli/src/utils/__tests__/install.test.ts` (Unit tests for `installComponent`, `resolveComponentTree`).
- **Read-Only**: `packages/cli/src/utils/package-manager.ts`, `packages/cli/src/registry/types.ts`.

# Implementation Spec
- **Architecture**: Use `vitest` (already configured) to run unit tests. Mock `fs` to avoid disk I/O, `RegistryClient` to simulate network/registry responses, and `prompts`/`console` where necessary.
- **Public API Changes**: None (internal change: exporting `resolveComponentTree` from `install.ts`).
- **Pseudo-Code**:
  - **install.ts change**: simply add `export` keyword to `resolveComponentTree`.
  - **config.test.ts**:
    - Mock `fs.existsSync`, `fs.readFileSync`, `fs.writeFileSync`.
    - Test `loadConfig`: returns parsed JSON, returns null if missing, throws on invalid JSON.
    - Test `saveConfig`: writes JSON stringified, throws on error.
  - **install.test.ts**:
    - Mock `fs`, `path`, `RegistryClient`, `loadConfig`, `saveConfig`.
    - Test `resolveComponentTree`:
      - Recursive resolution (A -> B).
      - Cycle detection (A -> B -> A).
      - Framework filtering.
    - Test `installComponent`:
      - Successfully installs files (fs.writeFileSync).
      - Skips existing files if `overwrite: false`.
      - Overwrites if `overwrite: true`.
      - Installs npm dependencies (mock `installPackage`).
      - Updates `helios.config.json` component list.
- **Dependencies**: None (Vitest is ready).

# Test Plan
- **Verification**: Run `npm run test` in `packages/cli`.
- **Success Criteria**: All new tests pass, covering happy paths, error cases, and edge cases (cycles, missing config).
- **Edge Cases**:
  - Circular registry dependencies.
  - Missing configuration file.
  - Network failure in RegistryClient (mocked).
  - File permission errors (mocked fs throw).
