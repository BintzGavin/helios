# 2026-03-05-INFRASTRUCTURE-Bounded-Dependency-Synchronizer

1. Context & Goal
- Objective: Implement a workspace dependency synchronizer to propagate internal versions across the monorepo, strictly ensuring it operates within bounded test directories to prevent domain boundary violations.
- Trigger: Agents are blocked by dependency mismatches they cannot fix manually, but previous plans required modifying files outside the Infrastructure domain.
- Impact: Enables deterministic release tooling for dependency governance without violating agent boundaries during implementation and testing.

2. File Inventory
- Create:
  - packages/infrastructure/src/governance/sync-workspace.ts (Core logic to synchronize internal package versions, accepting a rootDir argument)
  - packages/infrastructure/tests/governance/sync-workspace.test.ts (Unit tests using a bounded virtual file system or temporary directory)
- Modify:
  - packages/infrastructure/package.json (Add script definition if needed, though strictly internal)
- Read-Only: None.

3. Implementation Spec
- Architecture: Create a Node utility that accepts a rootDir argument. It scans the provided directory for package.json files, identifies workspace dependencies (e.g., dependencies on @helios-project/*), and synchronizes their versions to the actual package versions found in the rootDir. It MUST enforce that rootDir is not the live monorepo root when run by agents during testing.
- Pseudo-Code:
  - Parse arguments to extract rootDir.
  - Discover package.json files within rootDir/packages/*.
  - Build a map of internal package names to their current version.
  - Iterate through all packages, updating dependencies and devDependencies if they reference a known workspace package to match the explicit version number (e.g. ^0.24.0).
  - Write updated package.json files back to disk within the bounded rootDir.
- Public API Changes: Export a syncWorkspaceDependencies(rootDir: string) function for programmatic use.
- Dependencies: None.
- Cloud Considerations: N/A for this governance tool.

4. Test Plan
- Verification: Run npm run test in packages/infrastructure/.
- Success Criteria: Tests must pass using a bounded test directory or mocked file system (vi.mock('node:fs/promises')), successfully demonstrating that the script updates internal dependency versions without touching the real monorepo files.
- Edge Cases: Handle packages that don't have dependencies, handle missing versions, ensure exact version matching (e.g., ^0.24.0).
- Integration Verification: Ensure the executor does NOT run this script against the live monorepo, verifying only via bounded unit tests.