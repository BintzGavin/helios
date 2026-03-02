#### 1. Context & Goal
- **Objective**: Implement a workspace dependency synchronizer script to automate internal version propagation across the monorepo.
- **Trigger**: Agents are frequently blocked from updating cross-package dependencies due to strict domain boundaries (e.g., INFRASTRUCTURE cannot modify CLI's `package.json`). `AGENTS.md` explicitly mandates that "internal version propagation is handled by release tooling" and positions "governance tooling" within the INFRASTRUCTURE domain.
- **Impact**: Unblocks agents from manually handling dependency synchronization and establishes the governance tooling required to keep internal workspace versions consistent without violating domain boundaries.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/governance/sync-workspace-deps.ts` (The synchronizer script)
  - `packages/infrastructure/tests/governance/sync-workspace-deps.test.ts` (Tests for the script)
- **Modify**:
  - `packages/infrastructure/package.json` (Add script to run synchronizer)
  - `packages/infrastructure/src/index.ts` (Export the governance module if needed, or keep it as an internal CLI tool)
- **Read-Only**:
  - `package.json` (Root package to identify workspaces)

#### 3. Implementation Spec
- **Architecture**: A standalone Node.js script using the `node:fs` and `node:path` modules. The script scans all `package.json` files defined in the root workspace, maps out the current versions of all `@helios-project/*` packages, and then updates any internal dependency declarations (e.g., `"@helios-project/infrastructure": "^0.13.0"`) to match the latest built versions (e.g., `"@helios-project/infrastructure": "^0.24.1"`).
- **Pseudo-Code**:
  - Read root `package.json` workspaces.
  - Resolve paths using `glob` or `fs.readdir` (e.g., `packages/*`).
  - Pass 1: Read all workspace `package.json` files to build a dictionary of package names to their current version.
  - Pass 2: Iterate through each workspace `package.json`. If `dependencies` or `devDependencies` contains a key starting with `@helios-project/`, update the value to `^{currentVersion}`.
  - Write updated JSON back to the file system if changes were detected.
- **Public API Changes**: None for public consumers. Adds an internal tooling script.
- **Dependencies**: None.
- **Cloud Considerations**: N/A - Local governance tooling.

#### 4. Test Plan
- **Verification**: Run `npm run test` and `npm run lint` in `packages/infrastructure` to verify the script logic.
- **Success Criteria**: Unit tests pass using a mock file system verifying that old dependency versions are successfully bumped to the exact versions of the mock packages.
- **Edge Cases**: Packages without `@helios-project` dependencies are ignored; formatting of `package.json` is preserved (using 2 spaces).
- **Integration Verification**: Ensure the module can be run as a standalone script using `npx tsx` or standard node.