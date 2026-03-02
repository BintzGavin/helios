#### 1. Context & Goal
- **Objective**: Implement a workspace dependency synchronizer tool within the infrastructure package that operates strictly within bounded test directories via a `rootDir` argument, ensuring strict domain boundary compliance.
- **Trigger**: The INFRASTRUCTURE domain is responsible for "governance tooling" per `AGENTS.md` and `.jules/INFRASTRUCTURE.md`, but prior plans requested cross-package modifications that violated strict domain boundaries.
- **Impact**: Unblocks dependency propagation across the workspace by providing a safe, tested tool that can synchronize dependencies without the EXECUTOR agent needing to manually modify external domain files.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/governance/workspace-dependency-synchronizer.ts`: The core synchronizer logic.
  - `packages/infrastructure/tests/governance/workspace-dependency-synchronizer.test.ts`: Tests verifying behavior using bounded test directories.
- **Modify**:
  - `packages/infrastructure/src/index.ts`: Export the newly created governance tool.
- **Read-Only**:
  - `AGENTS.md`: For context regarding governance boundaries and tooling.

#### 3. Implementation Spec
- **Architecture**: A generic utility function `syncWorkspaceDependencies(options: { rootDir: string })` that takes an explicit `rootDir`. It scans for `packages/*/package.json` within that specific root, identifies internal dependencies, and synchronizes versions. It MUST NOT modify the live monorepo `package.json` files during EXECUTOR implementation; it must operate on a temporary or mocked file system provided during testing.
- **Pseudo-Code**:
  - Define and export `syncWorkspaceDependencies(options)`.
  - Read the root package.json at `options.rootDir` to determine workspace patterns.
  - Iterate over discovered workspace package.json files.
  - For each package, identify internal cross-dependencies.
  - Synchronize versions based on the source package's declared version.
  - Write the changes back strictly into `options.rootDir`.
- **Public API Changes**: Add `syncWorkspaceDependencies` to `src/index.ts` exports.
- **Dependencies**: None external, purely Node.js standard library (`fs`, `path`).
- **Cloud Considerations**: Part of generic infrastructure tooling; must remain environment agnostic.

#### 4. Test Plan
- **Verification**: Run `npm run test` in `packages/infrastructure/` to run all tests.
- **Success Criteria**: The tests should create a virtual or temporary file structure (e.g., via `vitest`'s mocked file system or a bounded `__fixtures__` directory), execute `syncWorkspaceDependencies` targeting that mock `rootDir`, and assert the resulting mocked `package.json` files reflect synchronized versions. The actual monorepo files MUST NOT be modified.
- **Edge Cases**: Missing workspace packages, malformed JSON files, circular dependencies, and unchanged files should be verified.
- **Integration Verification**: Run `npm run lint` in `packages/infrastructure/` to ensure new code meets project standards.