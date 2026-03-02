#### 1. Context & Goal
- **Objective**: Implement a Workspace Dependency Synchronizer tool to automate internal version propagation across the monorepo, while strictly adhering to the domain boundary (i.e. not modifying cross-package files directly but acting as a governance utility script).
- **Trigger**: The INFRASTRUCTURE agent is blocked by a dependency mismatch (e.g., CLI needing the latest infrastructure package) and cannot manually edit cross-package `package.json` files due to strict domain boundaries. `AGENTS.md` explicitly delegates this to "governance tooling". This plan ensures the implemented tool relies entirely on mocked or strictly bounded file systems during tests.
- **Impact**: Unblocks autonomous agents by providing deterministic tooling to synchronize internal package versions, preventing agents from stalling on dependency governance tasks.

#### 2. File Inventory
- **Create**: `packages/infrastructure/src/governance/sync-dependencies.ts` (The synchronization script)
- **Create**: `packages/infrastructure/tests/governance/sync-dependencies.test.ts` (Unit tests for the synchronizer)
- **Modify**: `packages/infrastructure/package.json` (Add a `sync-versions` script to expose the tool)
- **Read-Only**: `AGENTS.md` (Domain boundary constraints)

#### 3. Implementation Spec
- **Architecture**: A standalone Node.js script executed via `npm run`. It will scan all `package.json` files within a specified root directory (defaults to the monorepo root), build a map of current internal package versions, and then perform a second pass to update any inter-dependencies (in `dependencies` or `devDependencies`) to match the latest discovered versions exactly (using the `^` prefix where applicable per monorepo rules).
- **Pseudo-Code**:
  - Accept an optional `--rootDir` argument (useful for testing on mock directories).
  - Glob all `packages/*/package.json` within the root directory.
  - Parse each `package.json` to extract `name` and `version` into a `packageVersions` registry.
  - Iterate through all parsed `package.json` files again.
  - For each file, inspect `dependencies` and `devDependencies`. If a dependency exists in the `packageVersions` registry, update its version constraint to `^${packageVersions[dependencyName]}`.
  - If changes were made to a `package.json`, write it back to disk.
- **Public API Changes**: No exported runtime API changes; this is a development/governance tool.
- **Dependencies**: No new runtime dependencies. Will use native `node:fs` and `node:path`.
- **Cloud Considerations**: Not applicable. This is local build/governance infrastructure.

#### 4. Test Plan
- **Verification**: Run `npm run test` in `packages/infrastructure` to execute `sync-dependencies.test.ts` and `npm run lint`.
- **Success Criteria**:
  - The unit test MUST NOT operate on the actual monorepo `packages/`. It MUST create a temporary mock directory structure with dummy `package.json` files to verify functionality without violating domain boundaries.
  - It should verify that an outdated dependency (e.g., `"@helios-project/infrastructure": "^0.1.0"`) in a mock package is updated to the correct version found in the mock registry (e.g., `"^0.24.1"`).
- **Edge Cases**:
  - Packages without `dependencies` or `devDependencies`.
  - Dependencies that are not part of the internal workspace (should be ignored).
- **Integration Verification**: Ensure the tool can be safely run locally by a developer (`npm run sync-versions`) to synchronize `packages/*/package.json` internal dependency versions.
