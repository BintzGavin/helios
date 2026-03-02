#### 1. Context & Goal
- **Objective**: Implement a Workspace Dependency Synchronizer tool to automate internal version propagation across the monorepo.
- **Trigger**: The INFRASTRUCTURE agent is blocked by a dependency mismatch (e.g., CLI needing the latest infrastructure package) and cannot manually edit cross-package `package.json` files due to strict domain boundaries. `AGENTS.md` explicitly delegates this to "governance tooling".
- **Impact**: Unblocks autonomous agents by providing deterministic tooling to synchronize internal package versions, preventing agents from stalling on dependency governance tasks.

#### 2. File Inventory
- **Create**: `packages/infrastructure/src/governance/sync-dependencies.ts` (The synchronization script)
- **Create**: `packages/infrastructure/tests/governance/sync-dependencies.test.ts` (Unit tests for the synchronizer)
- **Modify**: `packages/infrastructure/package.json` (Add a `sync-versions` script to expose the tool)
- **Read-Only**: `AGENTS.md` (Domain boundary constraints)

#### 3. Implementation Spec
- **Architecture**: A standalone Node.js script executed via `npm run`. It will scan all `package.json` files within the monorepo workspaces (e.g., `packages/*`), build a map of current internal package versions, and then perform a second pass to update any inter-dependencies (in `dependencies` or `devDependencies`) to match the latest discovered versions exactly (using the `^` prefix where applicable per monorepo rules).
- **Pseudo-Code**:
  - Resolve the monorepo root (e.g., by traversing up from `__dirname` until `helio.config.json` or root `package.json` is found).
  - Glob all `packages/*/package.json`.
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
  - The unit test should mock `fs.promises` or use a temporary directory with dummy `package.json` files.
  - It should verify that an outdated dependency (e.g., `"@helios-project/infrastructure": "^0.1.0"`) is updated to the correct version found in the mock registry (e.g., `"^0.24.1"`).
  - Running the script should successfully update real monorepo packages without breaking JSON formatting.
- **Edge Cases**:
  - Packages without `dependencies` or `devDependencies`.
  - Dependencies that are not part of the internal workspace (should be ignored).
- **Integration Verification**: After running the script locally, all `packages/*/package.json` internal dependency versions should be synchronized, allowing dependent agents to proceed without boundary violations.